import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

const allowedConsent = new Set(["unknown", "opted_in", "opted_out"]);

function normalizeTags(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((tag) => tag.trim()).filter(Boolean);
  return [];
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const body = await request.json();
    const contactId = String(body?.contactId || "");

    if (!contactId) {
      return NextResponse.json({ ok: false, error: "contactId is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof body?.name === "string") updates.name = body.name.trim();
    if (typeof body?.email === "string") updates.email = body.email.trim() || null;
    if (typeof body?.company === "string") updates.company = body.company.trim() || null;

    if (typeof body?.consentStatus === "string") {
      if (!allowedConsent.has(body.consentStatus)) {
        return NextResponse.json({ ok: false, error: "Invalid consentStatus" }, { status: 400 });
      }

      updates.consent_status = body.consentStatus;
    }

    if (body?.tags !== undefined) {
      updates.tags = normalizeTags(body.tags);
    }

    const client = createSupabaseWriteClient();

    const { data, error } = await client
      .from("crm_contacts")
      .update(updates)
      .eq("id", contactId)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .select("id, name, phone, email, company, consent_status, tags, updated_at")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ ok: false, error: "Contato não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, contact: data });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to update contact" },
      { status: 500 },
    );
  }
}

