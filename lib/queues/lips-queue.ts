import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppContext } from "@/lib/auth/app-context";
import { departmentLabel, normalizeDepartmentName, routeLipsConversation, type QueueKey, type QueuePriority, type QueueStatus } from "./lips-routing";

export type QueueDb = SupabaseClient;

export const OFFICIAL_QUEUE_STATUSES: QueueStatus[] = ["waiting", "in_progress", "awaiting_customer", "resolved", "closed"];
export const ACTIVE_QUEUE_STATUSES = ["waiting", "in_progress", "awaiting_customer"];

export function isSupervisorRole(role: AppContext["role"] | string) {
  return role === "owner" || role === "admin";
}

export function slaStatusFromDueAt(dueAt?: string | null, status?: string | null, startedAt?: string | null) {
  if (!dueAt) return status === "completed" ? "completed" : "on_time";
  if (status === "completed") return "completed";
  const due = new Date(dueAt).getTime();
  if (Number.isNaN(due)) return "on_time";
  const now = Date.now();
  if (now > due) return "breached";
  const started = startedAt ? new Date(startedAt).getTime() : NaN;
  if (!Number.isNaN(started) && due > started) {
    const total = due - started;
    const remaining = due - now;
    if (remaining <= total * 0.25) return "warning";
  }
  return "on_time";
}

export function slaDueAt(minutes: number, now = new Date()) {
  if (minutes <= 0) return now.toISOString();
  return new Date(now.getTime() + minutes * 60_000).toISOString();
}

export async function assertConversationAccess(db: QueueDb, context: AppContext, conversationId: string) {
  const { data, error } = await db
    .from("whatsapp_conversations")
    .select("id, tenant_id, organization_id, channel_id, is_group, status, queue_status, assigned_to, assigned_user_id, department_id, requires_human, pending_reason, handoff_reason, queue_entered_at, assigned_at, last_assigned_at, last_assigned_user_id, resolved_at, channels(session_id)")
    .eq("id", conversationId)
    .eq("tenant_id", context.tenantId)
    .eq("organization_id", context.organizationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("conversation_not_found");
  if (data.is_group) throw new Error("groups_are_not_supported");
  return data;
}

export async function resolveDepartmentId(db: QueueDb, organizationId: string, key: QueueKey) {
  const { data, error } = await db
    .from("departments")
    .select("id, name")
    .eq("organization_id", organizationId)
    .eq("is_active", true);
  if (error) throw error;
  const department = (data ?? []).find((item) => normalizeDepartmentName(item.name) === key);
  if (!department) throw new Error(`department_not_found:${departmentLabel(key)}`);
  return department.id as string;
}

export async function userCanAccessDepartment(db: QueueDb, context: AppContext, departmentId: string | null) {
  if (isSupervisorRole(context.role)) return true;
  if (!departmentId) return true;
  const { data: tenantUser } = await db
    .from("tenant_users")
    .select("department_id")
    .eq("id", context.tenantUserId)
    .maybeSingle();
  if (tenantUser?.department_id === departmentId) return true;
  const { data: membership } = await db
    .from("department_memberships")
    .select("id")
    .eq("tenant_user_id", context.tenantUserId)
    .eq("department_id", departmentId)
    .eq("status", "active")
    .maybeSingle();
  return Boolean(membership);
}

export async function selectAvailableAssignee(db: QueueDb, input: { tenantId: string; organizationId: string; departmentId: string }) {
  const { data: memberships, error: membershipError } = await db
    .from("department_memberships")
    .select("app_user_id, last_assigned_at, capacity")
    .eq("tenant_id", input.tenantId)
    .eq("organization_id", input.organizationId)
    .eq("department_id", input.departmentId)
    .eq("status", "active");
  if (membershipError) throw membershipError;
  const userIds = (memberships ?? []).map((item) => item.app_user_id).filter(Boolean);
  if (userIds.length === 0) return null;

  const { data: availability, error: availabilityError } = await db
    .from("agent_availability")
    .select("app_user_id, status, capacity, active_conversations, current_load, accepting_new_conversations")
    .eq("tenant_id", input.tenantId)
    .eq("organization_id", input.organizationId)
    .in("app_user_id", userIds)
    .eq("status", "available")
    .eq("accepting_new_conversations", true);
  if (availabilityError) throw availabilityError;

  const available = (availability ?? [])
    .filter((item) => Number(item.current_load ?? item.active_conversations ?? 0) < Number(item.capacity ?? 1))
    .map((item) => ({
      appUserId: item.app_user_id as string,
      active: Number(item.current_load ?? item.active_conversations ?? 0),
      lastAssignedAt: memberships?.find((membership) => membership.app_user_id === item.app_user_id)?.last_assigned_at ?? null,
    }))
    .sort((a, b) => a.active - b.active || new Date(a.lastAssignedAt || 0).getTime() - new Date(b.lastAssignedAt || 0).getTime() || a.appUserId.localeCompare(b.appUserId));

  return available[0]?.appUserId ?? null;
}

export async function recordQueueEvent(db: QueueDb, input: {
  tenantId: string;
  organizationId: string;
  conversationId: string;
  actorType: "system" | "user" | "automation" | "provider";
  actorId?: string | null;
  eventType: string;
  previousState?: string | null;
  newState?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await db.from("whatsapp_conversation_events").insert({
    tenant_id: input.tenantId,
    organization_id: input.organizationId,
    conversation_id: input.conversationId,
    actor_type: input.actorType,
    actor_id: input.actorId ?? null,
    event_type: input.eventType,
    event_source: "queue",
    previous_state: input.previousState ?? null,
    new_state: input.newState ?? null,
    description: input.description ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function routeAndQueueConversation(db: QueueDb, context: AppContext, input: {
  conversationId: string;
  messageBody: string;
  requiresHuman: boolean;
  automationResult?: string;
  commercialIntent?: string;
}) {
  const conversation = await assertConversationAccess(db, context, input.conversationId);
  if (conversation.queue_status === "closed") throw new Error("closed_conversation_requires_manual_admin_action");
  const decision = routeLipsConversation({
    conversationId: input.conversationId,
    messageBody: input.messageBody,
    automationResult: input.automationResult,
    commercialIntent: input.commercialIntent,
    requiresHuman: input.requiresHuman,
    currentDepartmentId: conversation.department_id,
    currentAssignedUserId: conversation.assigned_user_id ?? conversation.assigned_to,
    currentStatus: conversation.queue_status,
  });
  const departmentId = await resolveDepartmentId(db, context.organizationId, decision.queueKey);
  const now = new Date();
  const currentAssignee = conversation.assigned_user_id ?? conversation.assigned_to;
  const autoAssignee = decision.preserveCurrentAssignment && currentAssignee ? currentAssignee : await selectAvailableAssignee(db, { tenantId: context.tenantId, organizationId: context.organizationId, departmentId });
  const nextStatus = autoAssignee ? "in_progress" : "waiting";
  const patch = {
    department_id: departmentId,
    assigned_user_id: autoAssignee,
    assigned_to: autoAssignee,
    last_assigned_user_id: autoAssignee,
    last_assigned_at: autoAssignee ? now.toISOString() : null,
    assigned_at: autoAssignee ? now.toISOString() : null,
    priority: decision.priority,
    queue_status: nextStatus,
    requires_human: input.requiresHuman || decision.priority !== "normal",
    pending_reason: decision.reason,
    handoff_reason: decision.reason,
    queue_reason: decision.reason,
    queue_entered_at: now.toISOString(),
    sla_started_at: now.toISOString(),
    sla_due_at: slaDueAt(decision.slaMinutes, now),
    sla_status: "on_time",
    updated_at: now.toISOString(),
  };
  const { data, error } = await db
    .from("whatsapp_conversations")
    .update(patch)
    .eq("id", input.conversationId)
    .eq("tenant_id", context.tenantId)
    .eq("organization_id", context.organizationId)
    .select("id, queue_status, department_id, priority, sla_due_at, sla_status")
    .single();
  if (error) throw error;
  await recordQueueEvent(db, {
    tenantId: context.tenantId,
    organizationId: context.organizationId,
    conversationId: input.conversationId,
    actorType: "system",
    eventType: "queue_entered",
    previousState: conversation.queue_status,
    newState: nextStatus,
    description: `Roteado para ${departmentLabel(decision.queueKey)}.`,
    metadata: { queueKey: decision.queueKey, reason: decision.reason, priority: decision.priority, slaMinutes: decision.slaMinutes },
  });
  return { conversation: data, decision };
}

export function priorityToLabel(priority?: string | null) {
  if (priority === "urgent" || priority === "urgente") return "urgente";
  if (priority === "high" || priority === "alta") return "alta";
  if (priority === "low" || priority === "baixa") return "baixa";
  return "normal";
}
