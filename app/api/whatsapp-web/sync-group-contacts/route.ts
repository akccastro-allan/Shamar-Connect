import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
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

async function syncGroupContacts(groupIds?: string[], groupLimit = 20) {
  const context = await getRequiredAppContext();
  const client = createSupabaseWriteClient();
  const groups = await whatsappWebGatewayClient.listGroups();
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
      const participants = await whatsappWebGatewayClient.listGroupParticipants(group.id);
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get("groupId");
    const groupLimit = Math.min(Number(searchParams.get("groupLimit") || 20), 100);
    const result = await syncGroupContacts(groupId ? [groupId] : undefined, groupLimit);
    return NextResponse.json(result);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to sync group contacts" },
      { status: 500 },
    );
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
    const result = await syncGroupContacts(groupIds, groupLimit);
    return NextResponse.json(result);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to sync group contacts" },
      { status: 500 },
    );
  }
}
