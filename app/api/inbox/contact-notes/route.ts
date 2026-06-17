import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

async function validateContactOrConversation(params: {
  client: ReturnType<typeof createSupabaseServerClient>;
  tenantId: string;
  organizationId: string;
  contactId?: string | null;
  conversationId?: string | null;
}) {
  const { client, tenantId, organizationId, contactId, conversationId } = params;

  if (conversationId) {
    const { data, error } = await client
      .from("whatsapp_conversations")
      .select("id, contact_id")
      .eq("id", conversationId)
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      contactId: data.contact_id || contactId || null,
      conversationId: data.id,
    };
  }

  if (contactId) {
    const { data, error } = await client
      .from("crm_contacts")
      .select("id")
      .eq("id", contactId)
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      contactId: data.id,
      conversationId: null,
    };
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const contactId = request.nextUrl.searchParams.get("contactId");
    const conversationId = request.nextUrl.searchParams.get("conversationId");

    if (!contactId && !conversationId) {
      return NextResponse.json({ ok: false, error: "contactId or conversationId is required" }, { status: 400 });
    }

    const client = createSupabaseServerClient();

    const validated = await validateContactOrConversation({
      client,
      tenantId: context.tenantId,
      organizationId: context.organizationId,
      contactId,
      conversationId,
    });

    if (!validated) {
      return NextResponse.json({ ok: false, error: "Contato ou conversa não encontrado." }, { status: 404 });
    }

    let query = client
      .from("crm_contact_notes")
      .select("id, contact_id, conversation_id, note, created_by, created_at")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (validated.contactId) query = query.eq("contact_id", validated.contactId);
    if (!validated.contactId && validated.conversationId) query = query.eq("conversation_id", validated.conversationId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ ok: true, notes: data || [] });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load notes" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const body = await request.json();

    const contactId = body?.contactId ? String(body.contactId) : null;
    const conversationId = body?.conversationId ? String(body.conversationId) : null;
    const note = String(body?.note || "").trim();

    if (!note || (!contactId && !conversationId)) {
      return NextResponse.json({ ok: false, error: "note and contactId or conversationId are required" }, { status: 400 });
    }

    const client = createSupabaseWriteClient();

    const validated = await validateContactOrConversation({
      client,
      tenantId: context.tenantId,
      organizationId: context.organizationId,
      contactId,
      conversationId,
    });

    if (!validated) {
      return NextResponse.json({ ok: false, error: "Contato ou conversa não encontrado." }, { status: 404 });
    }

    const { data, error } = await client
      .from("crm_contact_notes")
      .insert({
        tenant_id: context.tenantId,
        organization_id: context.organizationId,
        contact_id: validated.contactId,
        conversation_id: validated.conversationId,
        note,
        created_by: context.name,
      })
      .select("id, contact_id, conversation_id, note, created_by, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, note: data });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to save note" },
      { status: 500 },
    );
  }
}

