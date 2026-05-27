import { NextRequest, NextResponse } from "next/server";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

function normalizePhone(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const groupId = String(body?.groupId || "");

    if (!groupId) {
      return NextResponse.json({ ok: false, error: "groupId is required" }, { status: 400 });
    }

    const client = createSupabaseWriteClient();
    const participants = await whatsappWebGatewayClient.listGroupParticipants(groupId);
    const firstParticipant = participants[0];
    const groupName = firstParticipant?.sourceGroupName || body?.groupName || groupId;

    const uniqueParticipants = Array.from(
      new Map(
        participants
          .map((participant) => ({ ...participant, phone: normalizePhone(participant.phone) }))
          .filter((participant) => participant.phone)
          .map((participant) => [participant.phone, participant])
      ).values()
    );

    const { data: group, error: groupError } = await client
      .from("whatsapp_groups")
      .upsert({
        external_group_id: groupId,
        provider: "whatsapp_web",
        name: groupName,
        participant_count: participants.length,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "external_group_id" })
      .select("id")
      .single();

    if (groupError) throw groupError;

    const { data: list, error: listError } = await client
      .from("group_contact_lists")
      .insert({
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
      phone: participant.phone,
      name: participant.name || participant.phone,
      source: "whatsapp_group_export",
      consent_status: "unknown",
      tags: ["grupo_whatsapp", groupName],
      updated_at: new Date().toISOString(),
    }));

    if (contactRows.length > 0) {
      const { error: contactsError } = await client
        .from("crm_contacts")
        .upsert(contactRows, { onConflict: "phone" });

      if (contactsError) throw contactsError;
    }

    const { data: savedContacts, error: savedContactsError } = await client
      .from("crm_contacts")
      .select("id, phone")
      .in("phone", uniqueParticipants.map((participant) => participant.phone));

    if (savedContactsError) throw savedContactsError;

    const contactIdByPhone = new Map((savedContacts || []).map((contact) => [contact.phone, contact.id]));

    const listItems = uniqueParticipants.map((participant) => ({
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
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to export group contacts" }, { status: 500 });
  }
}
