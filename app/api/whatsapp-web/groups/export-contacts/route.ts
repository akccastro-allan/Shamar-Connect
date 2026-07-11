import { NextRequest, NextResponse } from "next/server";
import { isUnauthorizedError } from "@/lib/auth/app-context";
import { requireOwnedWhatsappSession } from "../../_auth";
import { upsertTenantRow } from "../../_tenant-upsert";
import type { ProviderGroupParticipant } from "@/types/messaging-provider";

function normalizePhone(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const groupId = String(body?.groupId || "");
    const sessionId = String(body?.sessionId || "");

    if (!groupId) {
      return NextResponse.json({ ok: false, error: "groupId is required" }, { status: 400 });
    }

    const session = await requireOwnedWhatsappSession(sessionId);
    if (!session.ok) return session.response;

    const { context, db: client } = session;
    const participants = await session.resolved.client.listGroupParticipants(groupId);
    const firstParticipant = participants[0];
    const groupName = firstParticipant?.sourceGroupName || body?.groupName || groupId;

    const uniqueParticipants: ProviderGroupParticipant[] = Array.from(
      new Map(
        participants
          .map((participant) => ({ ...participant, phone: normalizePhone(participant.phone) }))
          .filter((participant) => participant.phone)
          .map((participant) => [participant.phone, participant] as [string, ProviderGroupParticipant])
      ).values()
    );

    const group = await upsertTenantRow(client, context, "whatsapp_groups", {
      provider: "whatsapp_web",
      external_group_id: groupId,
    }, {
        external_group_id: groupId,
        provider: "whatsapp_web",
        name: groupName,
        participant_count: participants.length,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    const { data: list, error: listError } = await client
      .from("group_contact_lists")
      .insert({
        tenant_id: context.tenantId,
        organization_id: context.organizationId,
        name: `Exportação - ${groupName}`,
        source_group_id: group?.id,
        status: "draft",
        total_participants: participants.length,
        unique_contacts: uniqueParticipants.length,
        duplicates_removed: participants.length - uniqueParticipants.length,
      })
      .select("id")
      .single();

    if (listError) throw listError;

    const contactRows = uniqueParticipants.map((participant) => ({
      tenant_id: context.tenantId,
      organization_id: context.organizationId,
      phone: participant.phone,
      name: participant.name || participant.phone,
      source: "whatsapp_group_export",
      consent_status: "unknown",
      tags: ["grupo_whatsapp", groupName],
      updated_at: new Date().toISOString(),
    }));

    for (const contactRow of contactRows) {
      await upsertTenantRow(client, context, "crm_contacts", { phone: contactRow.phone }, contactRow);
    }

    const { data: savedContacts, error: savedContactsError } = await client
      .from("crm_contacts")
      .select("id, phone")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .in("phone", uniqueParticipants.map((p) => p.phone));

    if (savedContactsError) throw savedContactsError;

    const contactIdByPhone = new Map((savedContacts || []).map((c) => [c.phone, c.id]));

    const listItems = uniqueParticipants.map((participant) => ({
      tenant_id: context.tenantId,
      organization_id: context.organizationId,
      list_id: list.id,
      contact_id: contactIdByPhone.get(participant.phone) || null,
      name: participant.name || participant.phone,
      phone: participant.phone,
      source_group_name: groupName,
      consent_status: "unknown",
      crm_status: contactIdByPhone.get(participant.phone) ? "existing" : "new",
      notes: participant.isAdmin ? ["admin_do_grupo"] : [],
    }));

    if (listItems.length > 0) {
      const { error: itemsError } = await client
        .from("group_contact_list_items")
        .insert(listItems);

      if (itemsError) throw itemsError;
    }

    return NextResponse.json({
      ok: true,
      groupId,
      groupName,
      listId: list.id,
      totalParticipants: participants.length,
      uniqueContacts: uniqueParticipants.length,
      duplicatesRemoved: participants.length - uniqueParticipants.length,
    });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to export group contacts" }, { status: 500 });
  }
}
