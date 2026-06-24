import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server";

async function countTable(table: string, organizationId: string) {
  try {
    const db = createSupabaseWriteClient();
    const { count, error } = await db
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId);
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
  try {
    const context = await getRequiredAppContext();
    const orgId = context.organizationId;

    const [contacts, conversations, messages, lists, listItems, whatsapp] = await Promise.all([
      countTable("crm_contacts", orgId),
      countTable("whatsapp_conversations", orgId),
      countTable("whatsapp_messages", orgId),
      countTable("group_contact_lists", orgId),
      countTable("group_contact_list_items", orgId),
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
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao carregar resumo" },
      { status: 500 },
    );
  }
}
