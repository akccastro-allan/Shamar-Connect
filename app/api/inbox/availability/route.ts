import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

const schema = z.object({ status: z.enum(["available", "paused", "offline"]) });

export async function GET() {
  try {
    const context = await getRequiredAppContext();
    const db = createSupabaseWriteClient();
    const { data, error } = await db
      .from("agent_availability")
      .select("status, accepting_new_conversations, current_load, capacity, updated_at")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("app_user_id", context.appUserId)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ ok: true, availability: data ?? { status: "offline", accepting_new_conversations: false, current_load: 0 } });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao carregar disponibilidade." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const body = schema.parse(await request.json().catch(() => ({})));
    const db = createSupabaseWriteClient();
    const now = new Date().toISOString();
    const accepting = body.status === "available";

    const { data: previous, error: previousError } = await db
      .from("agent_availability")
      .select("status")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("app_user_id", context.appUserId)
      .maybeSingle();
    if (previousError) throw previousError;

    const write = previous
      ? db
        .from("agent_availability")
        .update({ status: body.status, accepting_new_conversations: accepting, updated_at: now })
        .eq("tenant_id", context.tenantId)
        .eq("organization_id", context.organizationId)
        .eq("app_user_id", context.appUserId)
      : db
        .from("agent_availability")
        .insert({
          tenant_id: context.tenantId,
          organization_id: context.organizationId,
          app_user_id: context.appUserId,
          status: body.status,
          accepting_new_conversations: accepting,
          current_load: 0,
          active_conversations: 0,
          updated_at: now,
        });

    const { data, error } = await write
      .select("status, accepting_new_conversations, current_load, capacity, updated_at")
      .single();
    if (error) throw error;

    await db.from("agent_availability_events").insert({
      tenant_id: context.tenantId,
      organization_id: context.organizationId,
      app_user_id: context.appUserId,
      actor_user_id: context.appUserId,
      previous_status: previous?.status ?? null,
      new_status: body.status,
      accepting_new_conversations: accepting,
      event_type: "availability_changed",
      metadata: {},
      created_at: now,
    });

    return NextResponse.json({ ok: true, availability: data });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao atualizar disponibilidade." }, { status: 500 });
  }
}
