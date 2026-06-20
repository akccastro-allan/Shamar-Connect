import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { normalizePhone } from "@/lib/phone";

export async function GET() {
  try {
    const context = await getRequiredAppContext();
    const db = createSupabaseWriteClient();
    const { data, error } = await db
      .from("crm_contacts")
      .select("id, name, phone, email, company, source, consent_status, tags, created_at, updated_at")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, contacts: data || [] });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load CRM contacts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const body = await request.json();

    const rawPhone = String(body?.phone || "").trim();
    if (!rawPhone) return NextResponse.json({ ok: false, error: "Telefone é obrigatório." }, { status: 400 });

    const phone = normalizePhone(rawPhone);
    if (phone.length < 10) return NextResponse.json({ ok: false, error: "Telefone inválido. Informe DDD + número." }, { status: 400 });

    const name = String(body?.name || "").trim() || phone;
    const email = String(body?.email || "").trim() || null;
    const company = String(body?.company || "").trim() || null;
    const source = String(body?.source || "manual").trim();
    const notes = String(body?.notes || "").trim() || null;
    const consentStatus = body?.consent_status === "opted_in" ? "opted_in" : body?.consent_status === "opted_out" ? "opted_out" : "unknown";
    const marketingOptIn = Boolean(body?.marketing_opt_in);
    const birthDate = body?.birth_date ? String(body.birth_date) : null;
    const lastPurchaseAt = body?.last_purchase_at ? String(body.last_purchase_at) : null;
    const lastServiceAt = body?.last_service_at ? String(body.last_service_at) : null;

    const rawTags = Array.isArray(body?.tags) ? (body.tags as unknown[]).map(String).filter(Boolean) : [];
    const tags = rawTags.length > 0 ? rawTags : [source];

    const db = createSupabaseWriteClient();

    const { data: existing } = await db
      .from("crm_contacts")
      .select("id, name, phone, email, company, source, consent_status, tags, updated_at")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, contact: existing, existing: true, message: "Este contato já existe." });
    }

    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      tenant_id: context.tenantId,
      organization_id: context.organizationId,
      name,
      phone,
      email,
      company,
      source,
      tags,
      consent_status: consentStatus,
      marketing_opt_in: marketingOptIn,
      created_at: now,
      updated_at: now,
    };

    if (birthDate) payload.birth_date = birthDate;
    if (lastPurchaseAt) payload.last_purchase_at = lastPurchaseAt;
    if (lastServiceAt) payload.last_service_at = lastServiceAt;

    const { data: created, error: insertError } = await db
      .from("crm_contacts")
      .insert(payload)
      .select("id, name, phone, email, company, source, consent_status, tags, updated_at")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: race } = await db
          .from("crm_contacts")
          .select("id, name, phone, email, company, source, consent_status, tags, updated_at")
          .eq("tenant_id", context.tenantId)
          .eq("organization_id", context.organizationId)
          .eq("phone", phone)
          .maybeSingle();
        return NextResponse.json({ ok: true, contact: race, existing: true, message: "Este contato já existe." });
      }
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
    }

    if (notes && created?.id) {
      await db.from("crm_contact_notes").insert({
        contact_id: created.id,
        note: notes,
        created_by: "contact_create_dialog",
      });
    }

    return NextResponse.json({ ok: true, contact: created, existing: false });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao salvar contato." }, { status: 500 });
  }
}
