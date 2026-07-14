import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { ACTIVE_QUEUE_STATUSES, isSupervisorRole, slaStatusFromDueAt } from "@/lib/queues/lips-queue";

export async function GET(request: Request) {
  try {
    const context = await getRequiredAppContext();
    const db = createSupabaseWriteClient();
    const url = new URL(request.url);
    const filter = url.searchParams.get("filter") || "all";
    const departmentId = url.searchParams.get("departmentId");
    const isSupervisor = isSupervisorRole(context.role);

    const { data: myMemberships } = await db
      .from("department_memberships")
      .select("department_id")
      .eq("tenant_user_id", context.tenantUserId)
      .eq("status", "active");
    const memberDepartmentIds = new Set((myMemberships ?? []).map((item) => item.department_id).filter(Boolean));

    const { data: tenantUser } = await db.from("tenant_users").select("department_id").eq("id", context.tenantUserId).maybeSingle();
    if (tenantUser?.department_id) memberDepartmentIds.add(tenantUser.department_id);

    let query = db
      .from("whatsapp_conversations")
      .select("id, external_chat_id, name, is_group, status, queue_status, stage, priority, unread_count, last_message_at, last_inbound_at, last_outbound_at, last_message_direction, requires_human, pending_reason, handoff_reason, queue_reason, queue_entered_at, assigned_at, sla_started_at, sla_due_at, sla_status, first_human_response_at, assigned_user_id, assigned_to, last_assigned_at, last_assigned_user_id, department_id, channel_id, provider, crm_contacts(id, name, phone, company), channels(id, session_id, provider, name), departments:department_id(id, name, color)")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("is_group", false)
      .order("sla_due_at", { ascending: true, nullsFirst: false })
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(150);

    if (filter === "mine") query = query.or(`assigned_user_id.eq.${context.appUserId},assigned_to.eq.${context.appUserId}`).in("queue_status", ACTIVE_QUEUE_STATUSES);
    else if (filter === "unassigned") query = query.is("assigned_user_id", null).is("assigned_to", null).eq("queue_status", "waiting");
    else if (filter === "critical") query = query.eq("sla_status", "breached");
    else if (filter === "awaiting_customer") query = query.eq("queue_status", "awaiting_customer");
    else if (filter === "resolved") query = query.eq("queue_status", "resolved");
    else query = query.in("queue_status", [...ACTIVE_QUEUE_STATUSES, "resolved"]);

    if (departmentId) query = query.eq("department_id", departmentId);
    if (!isSupervisor) {
      const clauses = [`assigned_user_id.eq.${context.appUserId}`, `assigned_to.eq.${context.appUserId}`, "department_id.is.null"];
      for (const id of memberDepartmentIds) clauses.push(`department_id.eq.${id}`);
      query = query.or(clauses.join(","));
    }

    const { data, error } = await query;
    if (error) throw error;

    const conversationIds = (data ?? []).map((item) => item.id);
    const latestByConversation = new Map<string, { body: string | null; direction: string; created_at: string }>();
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
      for (const message of messages ?? []) {
        if (!message.conversation_id || latestByConversation.has(message.conversation_id)) continue;
        latestByConversation.set(message.conversation_id, { body: message.body, direction: message.direction, created_at: message.created_at });
      }
    }

    const assignedIds = Array.from(new Set((data ?? []).map((item) => item.assigned_user_id ?? item.assigned_to).filter(Boolean) as string[]));
    const nameById = new Map<string, string>();
    if (assignedIds.length > 0) {
      const { data: users } = await db.from("app_users").select("id, name, email").in("id", assignedIds);
      for (const user of users ?? []) nameById.set(user.id, user.name || user.email || "Atendente");
    }

    return NextResponse.json({
      ok: true,
      me: { appUserId: context.appUserId, role: context.role, isSupervisor, departmentIds: Array.from(memberDepartmentIds) },
      conversations: (data ?? []).map((conversation) => ({
        ...conversation,
        assigned_to: conversation.assigned_user_id ?? conversation.assigned_to,
        sla_status: slaStatusFromDueAt(conversation.sla_due_at, conversation.sla_status, conversation.sla_started_at),
        assigned_name: conversation.assigned_user_id || conversation.assigned_to ? nameById.get(conversation.assigned_user_id ?? conversation.assigned_to) ?? null : null,
        latest_message: latestByConversation.get(conversation.id) ?? null,
      })),
    });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao carregar fila." }, { status: 500 });
  }
}
