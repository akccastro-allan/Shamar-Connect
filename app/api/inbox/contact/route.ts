import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

const allowedConsent = new Set(["unknown", "opted_in", "opted_out"]);

function normalizeTags(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((tag) => tag.trim()).filter(Boolean);
  return [];
}

export async function PATCH(request: NextRequest) {
  try {
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
      .select("id, name, phone, email, company, consent_status, tags, updated_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, contact: data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to update contact" }, { status: 500 });
  }
}
