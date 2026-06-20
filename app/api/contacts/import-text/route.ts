import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { parseContactsFromText } from "@/lib/contacts/import-parser";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const body = await request.json();
    const text = String(body?.text || "");
    const source = body?.source || "manual_paste";

    if (!text.trim()) return NextResponse.json({ ok: false, error: "text is required" }, { status: 400 });

    const contacts = parseContactsFromText(text, source);
    if (contacts.length === 0) return NextResponse.json({ ok: true, imported: 0, skipped: 0, contacts: [] });

    const db = createSupabaseWriteClient();
    const rows = contacts.map((contact) => ({
      tenant_id: context.tenantId,
      organization_id: context.organizationId,
      name: contact.name || contact.phone || contact.email || "Contato sem nome",
      phone: contact.phone || contact.email || crypto.randomUUID(),
      email: contact.email || null,
      company: contact.company || null,
      source: contact.source,
      consent_status: "unknown",
      tags: ["importado"],
      updated_at: new Date().toISOString(),
    }));

    const { error } = await db
      .from("crm_contacts")
      .upsert(rows, { onConflict: "phone" });

    if (error) throw error;

    return NextResponse.json({ ok: true, imported: rows.length, contacts });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to import contacts" }, { status: 500 });
  }
}
