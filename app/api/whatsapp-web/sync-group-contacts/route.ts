import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { resolveSessionClient, sessionIdErrorResponse } from "@/lib/providers/resolve-session";
import type { ProviderGroupParticipant, ProviderGroupSummary } from "@/types/messaging-provider";

function normalizePhone(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

function mergeTags(existing: unknown, extra: string[]) {
  const current = Array.isArray(existing) ? existing.map(String) : [];
  return [...new Set([...current, ...extra].map((tag) => tag.trim()).filter(Boolean))];
}

type AppContext = Awaited<ReturnType<typeof getRequiredAppContext>>;
type SupabaseWriteClient = ReturnType<typeof createSupabaseWriteClient>;

async function upsertGroupParticipantContact(
  client: SupabaseWriteClient,
  context: AppContext,
  participant: ProviderGroupParticipant,
) {
  const phone = normalizePhone(participant.phone || participant.id);
  if (!phone) {
    return { ok: false, skipped: true, reason: "missing_phone", participant };
  }

  const now = new Date().toISOString();
  const groupName = participant.sourceGroupName || "Grupo WhatsApp";
  const baseTags = ["whatsapp-group", `grupo:${groupName}`];

  const { data: existingContact, error: lookupError } = await client
    .from("crm_contacts")
    .select("id, name, tags")
    .eq("tenant_id", context.tenantId)
    .eq("organization_id", context.organizationId)
    .eq("phone", phone)
    .maybeSingle();

  if (lookupError) throw lookupError;

  const name = participant.name?.trim() || existingContact?.name || phone;

  if (existingContact?.id) {
    const { data, error } = await client
      .from("crm_contacts")
      .update({
        name,
        source: "whatsapp_group",
        tags: mergeTags(existingContact.tags, baseTags),
        updated_at: now,
      })
      .eq("id", existingContact.id)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .select("id, name, phone, tags")
      .single();

    if (error) throw error;
    return { ok: true, action: "updated", contact: data, participant };
  }

  const { data, error } = await client
    .from("crm_contacts")
    .insert({
      tenant_id: context.tenantId,
      organization_id: context.organizationId,
      phone,
      name,
      source: "whatsapp_group",
      consent_status: "unknown",
      tags: baseTags,
      created_at: now,
      updated_at: now,
    })
    .select("id, name, phone, tags")
    .single();

  if (error) throw error;
  return { ok: true, action: "created", contact: data, participant };
}

async function syncGroupContacts(groupIds?: string[], groupLimit = 20, sessionId?: string | null) {
  const context = await getRequiredAppContext();
  const resolved = resolveSessionClient(sessionId);
  if (!resolved) throw new Error(`sessionId inválido: ${sessionId}`);
  const client = createSupabaseWriteClient();

  // Verify the requested session belongs to this tenant/org
  const { data: ownedChannel } = await client
    .from("channels")
    .select("id")
    .eq("tenant_id", context.tenantId)
    .eq("organization_id", context.organizationId)
    .eq("session_id", resolved.sessionId)
    .maybeSingle();

  if (!ownedChannel) throw new Error("CHANNEL_FORBIDDEN");

  const groups = await resolved.client.listGroups();
  const selectedGroups = Array.isArray(groupIds) && groupIds.length > 0
    ? groups.filter((group) => groupIds.includes(group.id))
    : groups.slice(0, groupLimit);

  const groupResults = [];
  const errors = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const group of selectedGroups) {
    try {
      const participants = await resolved.client.listGroupParticipants(group.id);
      const participantResults = [];

      for (const participant of participants) {
        try {
          const result = await upsertGroupParticipantContact(client, context, participant);
          participantResults.push(result);
          if (result.skipped) skipped += 1;
          if (result.action === "created") created += 1;
          if (result.action === "updated") updated += 1;
        } catch (error) {
          errors.push({
            groupId: group.id,
            participantId: participant.id,
            step: "upsertParticipantContact",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      groupResults.push({
        groupId: group.id,
        groupName: group.name,
        participantCount: participants.length,
        processed: participantResults.length,
      });
    } catch (error) {
      errors.push({
        groupId: group.id,
        step: "listGroupParticipants",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    ok: errors.length === 0,
    partial: errors.length > 0,
    totalGatewayGroups: groups.length,
    syncedGroups: groupResults.length,
    created,
    updated,
    skipped,
    groupResults,
    errors: errors.slice(0, 30),
  };
}

function handleRouteError(error: unknown) {
  if (isUnauthorizedError(error)) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }
  if (error instanceof Error && error.message === "CHANNEL_FORBIDDEN") {
    return NextResponse.json({ ok: false, error: "Canal não encontrado." }, { status: 403 });
  }
  return NextResponse.json(
    { ok: false, error: error instanceof Error ? error.message : "Failed to sync group contacts" },
    { status: 500 },
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get("groupId");
    const sessionId = searchParams.get("sessionId");
    const groupLimit = Math.min(Number(searchParams.get("groupLimit") || 20), 100);
    if (sessionId && !resolveSessionClient(sessionId)) return sessionIdErrorResponse();
    const result = await syncGroupContacts(groupId ? [groupId] : undefined, groupLimit, sessionId);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const groupIds = Array.isArray(body?.groupIds)
      ? body.groupIds.map(String)
      : body?.groupId
        ? [String(body.groupId)]
        : undefined;
    const groupLimit = Math.min(Number(body?.groupLimit || 20), 100);
    const sessionId = body?.sessionId ? String(body.sessionId) : null;
    if (sessionId && !resolveSessionClient(sessionId)) return sessionIdErrorResponse();
    const result = await syncGroupContacts(groupIds, groupLimit, sessionId);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
