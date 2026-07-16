import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

type MessageRow = {
  conversation_id: string | null;
  body: string | null;
  direction: "inbound" | "outbound";
  created_at: string;
};

export async function GET() {
  try {
    const context = await getRequiredAppContext();
    const db = createSupabaseWriteClient();

    const isSupervisor = context.role === "owner" || context.role === "admin";

    // Setor do atendente logado (para escopo por departamento).
    let myDepartmentId: string | null = null;
    if (!isSupervisor) {
      const { data: tu } = await db
        .from("tenant_users")
        .select("department_id")
        .eq("id", context.tenantUserId)
        .maybeSingle();
      myDepartmentId = (tu?.department_id as string | null) ?? null;
    }

    let query = db
      .from("whatsapp_conversations")
      .select("id, external_chat_id, name, is_group, status, queue_status, unread_count, last_message_at, created_at, last_inbound_at, last_outbound_at, last_message_direction, requires_human, pending_reason, sla_status, sla_due_at, watchdog_checked_at, channel_id, provider, assigned_user_id, assigned_to, department_id, crm_contacts(id, name, phone, email, company, consent_status), channels(id, name, slug, color, transcription_enabled), departments:department_id(id, name, color)")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId);

    // Atendente/viewer: vê só o que é do seu setor, o que está atribuído a ele,
    // ou a fila geral (sem setor definido). Supervisor vê tudo.
    if (!isSupervisor) {
      const clauses = ["department_id.is.null", `assigned_user_id.eq.${context.appUserId}`, `assigned_to.eq.${context.appUserId}`];
      if (myDepartmentId) clauses.push(`department_id.eq.${myDepartmentId}`);
      query = query.or(clauses.join(","));
    }

    const { data: conversations, error: conversationsError } = await query
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(100);

    if (conversationsError) throw conversationsError;

    const conversationIds = (conversations || []).map((conversation) => conversation.id);

    let latestMessages: MessageRow[] = [];
    if (conversationIds.length > 0) {
      const { data: messages, error: messagesError } = await db
        .from("whatsapp_messages")
        .select("conversation_id, body, direction, created_at")
        .eq("tenant_id", context.tenantId)
        .eq("organization_id", context.organizationId)
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(500);

      if (messagesError) throw messagesError;
      latestMessages = messages || [];
    }

    const latestByConversation = new Map<string, MessageRow>();
    for (const message of latestMessages) {
      if (!message.conversation_id) continue;
      if (!latestByConversation.has(message.conversation_id)) {
        latestByConversation.set(message.conversation_id, message);
      }
    }

    // Resolve o nome de quem está atendendo (assigned_to = app_user id).
    const assignedIds = Array.from(
      new Set((conversations || []).map((c) => (c as { assigned_user_id?: string | null; assigned_to?: string | null }).assigned_user_id ?? (c as { assigned_to?: string | null }).assigned_to).filter(Boolean) as string[]),
    );
    const nameById = new Map<string, string>();
    if (assignedIds.length > 0) {
      const { data: users } = await db.from("app_users").select("id, name, email").in("id", assignedIds);
      for (const u of users || []) nameById.set(u.id, u.name || u.email || "");
    }

    return NextResponse.json({
      ok: true,
      me: { appUserId: context.appUserId, role: context.role, departmentId: myDepartmentId, isSupervisor },
      conversations: (conversations || []).map((conversation) => {
        const assignedTo = (conversation as { assigned_user_id?: string | null; assigned_to?: string | null }).assigned_user_id ?? (conversation as { assigned_to?: string | null }).assigned_to ?? null;
        return {
          ...conversation,
          assigned_to: assignedTo,
          latest_message: latestByConversation.get(conversation.id) || null,
          assigned_name: assignedTo ? nameById.get(assignedTo) || null : null,
        };
      }),
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load conversations" }, { status: 500 });
  }
}
