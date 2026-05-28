import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function countTable(table: string) {
  try {
    const db = createSupabaseServerClient();
    const { count, error } = await db.from(table).select("id", { count: "exact", head: true });
    if (error) return { count: 0, error: error.message };
    return { count: count || 0 };
  } catch (error) {
    return { count: 0, error: error instanceof Error ? error.message : "Erro desconhecido" };
  }
}

async function getWhatsappStatus() {
  const baseUrl = process.env.WHATSAPP_WEB_GATEWAY_URL?.replace(/\/$/, "");
  const token = process.env.WHATSAPP_WEB_GATEWAY_TOKEN || "";

  if (!baseUrl) return { status: "not_configured", phone: null };

  try {
    const response = await fetch(`${baseUrl}/status`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    return { status: data?.status || (response.ok ? "unknown" : "error"), phone: data?.phone || null };
  } catch {
    return { status: "error", phone: null };
  }
}

export async function GET() {
  const [contacts, conversations, messages, lists, listItems, whatsapp] = await Promise.all([
    countTable("crm_contacts"),
    countTable("whatsapp_conversations"),
    countTable("whatsapp_messages"),
    countTable("group_contact_lists"),
    countTable("group_contact_list_items"),
    getWhatsappStatus(),
  ]);

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    whatsapp,
    metrics: {
      contacts: contacts.count,
      conversations: conversations.count,
      messages: messages.count,
      importedLists: lists.count,
      importedContacts: listItems.count,
    },
    warnings: [contacts, conversations, messages, lists, listItems]
      .filter((item) => item.error)
      .map((item) => item.error),
  });
}
