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
    if (text.length > 100_000) return NextResponse.json({ ok: false, error: "Texto muito grande para importação." }, { status: 413 });

    const contacts = parseContactsFromText(text, source);
    if (contacts.length === 0) return NextResponse.json({ ok: true, imported: 0, skipped: 0, contacts: [] });
    if (contacts.length > 500) return NextResponse.json({ ok: false, error: "Limite de 500 contatos por importação." }, { status: 413 });

    const db = createSupabaseWriteClient();
    const rows = contacts.map((contact) => ({
      name: contact.name || contact.phone || contact.email || "Contato sem nome",
      phone: contact.phone || contact.email || crypto.randomUUID(),
      email: contact.email || null,
      company: contact.company || null,
      source: contact.source,
      consent_status: "unknown",
      tags: ["importado"],
      updated_at: new Date().toISOString(),
    }));

    for (const row of rows) {
      const { data: existing, error: lookupError } = await db
        .from("crm_contacts")
        .select("id")
        .eq("tenant_id", context.tenantId)
        .eq("organization_id", context.organizationId)
        .eq("phone", row.phone)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existing?.id) {
        const { consent_status, tags, ...updateRow } = row;
        void consent_status;
        void tags;

        const { error } = await db
          .from("crm_contacts")
          .update({ ...updateRow, tenant_id: context.tenantId, organization_id: context.organizationId })
          .eq("id", existing.id)
          .eq("tenant_id", context.tenantId)
          .eq("organization_id", context.organizationId);

        if (error) throw error;
      } else {
        const { error } = await db
          .from("crm_contacts")
          .insert({ ...row, tenant_id: context.tenantId, organization_id: context.organizationId });

        if (error) throw error;
      }
    }

    return NextResponse.json({ ok: true, imported: rows.length, contacts });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to import contacts" }, { status: 500 });
  }
}
