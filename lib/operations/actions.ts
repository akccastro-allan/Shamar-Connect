"use server";

import { revalidatePath } from "next/cache";
import { getRequiredAppContext } from "@/lib/auth/app-context";
import { canAccessCommandCenter, getTenantFeatureMetadata } from "@/lib/features/feature-flags";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getOperationsCompanySlugs, isAllowedOperationsCompanySlug } from "@/lib/operations/command-center-scope";

export type OperationsActionState = {
  ok: boolean;
  message?: string;
  error?: string;
};

type Db = ReturnType<typeof createSupabaseWriteClient>;

const REVALIDATE_PATHS = [
  "/operations",
  "/operations/companies",
  "/operations/tasks",
  "/operations/calendar",
  "/operations/content",
  "/operations/diagnostics",
  "/operations/audit",
];

function firstText(formData: FormData, key: string, max = 240) {
  return sanitizeOperationsText(String(formData.get(key) || ""), max);
}

function sanitizeOperationsText(value: string, max = 240) {
  return String(value || "")
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [token]")
    .replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]")
    .trim()
    .slice(0, max);
}

function requireChoice(value: string, allowed: string[], label: string) {
  if (!allowed.includes(value)) throw new Error(`${label} inválido.`);
  return value;
}

function parseDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function optionalDate(formData: FormData, key: string, label: string) {
  const value = firstText(formData, key, 80);
  if (!value) return null;
  const date = parseDate(value);
  if (!date) throw new Error(`${label} inválida.`);
  return date;
}

function sanitizeError(error: unknown) {
  return sanitizeOperationsText(
    error instanceof Error ? error.message : String(error || "Falha operacional."),
    220,
  );
}

async function requireOperationsActor(db: Db) {
  const context = await getRequiredAppContext();
  const metadata = await getTenantFeatureMetadata(db, context.tenantId);
  if (!canAccessCommandCenter(context, metadata)) throw new Error("FORBIDDEN");
  return context;
}

async function resolveInternalOrganization(db: Db, tenantId: string, slug: string) {
  if (!isAllowedOperationsCompanySlug(slug)) throw new Error("Empresa interna inválida.");
  const { data, error } = await db
    .from("organizations")
    .select("id, name, slug, status, metadata, email, phone, website_url")
    .eq("tenant_id", tenantId)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Empresa interna não configurada.");
  return data as Record<string, any>;
}

async function loadInternalOrganizationIds(db: Db, tenantId: string) {
  const { data, error } = await db
    .from("organizations")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("slug", getOperationsCompanySlugs());
  if (error) throw error;
  return new Set((data || []).map((organization: { id: string }) => organization.id));
}

async function auditOperation(
  db: Db,
  input: {
    actorUserId: string;
    actorName?: string | null;
    actorEmail?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    organizationId?: string | null;
    changedFields?: string[];
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await db.from("audit_trail").insert({
    actor_user_id: input.actorUserId,
    actor_name: input.actorName || null,
    actor_email: input.actorEmail || null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId || null,
    changed_fields: input.changedFields || [],
    metadata: {
      source: "operations_command_center",
      organization_id: input.organizationId || null,
      ...(input.metadata || {}),
    },
  });
  if (error) throw error;
}

function revalidateOperations() {
  for (const path of REVALIDATE_PATHS) revalidatePath(path);
}

export async function saveOperationsCompanyAction(
  _previous: OperationsActionState,
  formData: FormData,
): Promise<OperationsActionState> {
  const db = createSupabaseWriteClient();
  try {
    const actor = await requireOperationsActor(db);
    const companySlug = firstText(formData, "companySlug", 80);
    const organization = await resolveInternalOrganization(db, actor.tenantId, companySlug);
    const metadata = organization.metadata && typeof organization.metadata === "object" ? organization.metadata : {};
    const operations = {
      ...((metadata as Record<string, any>).operations || {}),
      description: firstText(formData, "description", 600),
      responsible: firstText(formData, "responsible", 120),
      publicContacts: firstText(formData, "publicContacts", 300),
      businessHours: firstText(formData, "businessHours", 300),
      operationalSettings: firstText(formData, "operationalSettings", 600),
    };
    const status = requireChoice(firstText(formData, "status", 40), ["active", "inactive", "suspended", "archived"], "Status");
    const { error } = await db
      .from("organizations")
      .update({
        status,
        email: firstText(formData, "email", 160) || null,
        phone: firstText(formData, "phone", 80) || null,
        website_url: firstText(formData, "websiteUrl", 220) || null,
        metadata: { ...metadata, operations },
        updated_at: new Date().toISOString(),
      })
      .eq("id", organization.id)
      .eq("tenant_id", actor.tenantId);
    if (error) throw error;
    await auditOperation(db, {
      actorUserId: actor.appUserId,
      actorName: actor.name,
      actorEmail: actor.email,
      action: "operations.company.update",
      entityType: "organization",
      entityId: organization.id,
      organizationId: organization.id,
      changedFields: ["status", "email", "phone", "website_url", "metadata.operations"],
    });
    revalidateOperations();
    return { ok: true, message: "Empresa atualizada." };
  } catch (error) {
    return { ok: false, error: sanitizeError(error) };
  }
}

export async function saveOperationsTaskAction(
  _previous: OperationsActionState,
  formData: FormData,
): Promise<OperationsActionState> {
  const db = createSupabaseWriteClient();
  try {
    const actor = await requireOperationsActor(db);
    const organization = await resolveInternalOrganization(db, actor.tenantId, firstText(formData, "companySlug", 80));
    const id = firstText(formData, "id", 80);
    const title = firstText(formData, "title", 180);
    if (!title) throw new Error("Informe o título da tarefa.");
    const payload = {
      tenant_id: actor.tenantId,
      organization_id: organization.id,
      title,
      description: firstText(formData, "description", 600) || null,
      assigned_to: firstText(formData, "assignedTo", 160) || null,
      priority: requireChoice(firstText(formData, "priority", 40) || "normal", ["low", "normal", "high", "urgent"], "Prioridade"),
      status: requireChoice(firstText(formData, "status", 40) || "pending", ["pending", "in_progress", "blocked", "completed", "cancelled"], "Status"),
      due_at: optionalDate(formData, "dueAt", "Prazo"),
      updated_at: new Date().toISOString(),
    };
    const query = id
      ? db.from("crm_tasks").update(payload).eq("id", id).eq("tenant_id", actor.tenantId).eq("organization_id", organization.id).select("id").single()
      : db.from("crm_tasks").insert({ ...payload, created_by: actor.appUserId }).select("id").single();
    const { data, error } = await query;
    if (error) throw error;
    await auditOperation(db, {
      actorUserId: actor.appUserId,
      actorName: actor.name,
      actorEmail: actor.email,
      action: id ? "operations.task.update" : "operations.task.create",
      entityType: "crm_task",
      entityId: data?.id || id,
      organizationId: organization.id,
      changedFields: Object.keys(payload),
    });
    revalidateOperations();
    return { ok: true, message: id ? "Tarefa atualizada." : "Tarefa criada." };
  } catch (error) {
    return { ok: false, error: sanitizeError(error) };
  }
}

export async function saveOperationsEventAction(
  _previous: OperationsActionState,
  formData: FormData,
): Promise<OperationsActionState> {
  const db = createSupabaseWriteClient();
  try {
    const actor = await requireOperationsActor(db);
    const organization = await resolveInternalOrganization(db, actor.tenantId, firstText(formData, "companySlug", 80));
    const id = firstText(formData, "id", 80);
    const title = firstText(formData, "title", 180);
    const startsAt = optionalDate(formData, "startsAt", "Data inicial");
    const endsAt = optionalDate(formData, "endsAt", "Data final");
    if (!title || !startsAt) throw new Error("Informe título e início do evento.");
    if (endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) throw new Error("Data final anterior ao início.");
    const payload = {
      tenant_id: actor.tenantId,
      organization_id: organization.id,
      title,
      description: firstText(formData, "description", 600) || null,
      event_type: requireChoice(firstText(formData, "eventType", 60) || "follow_up", ["follow_up", "meeting", "content", "task", "internal"], "Tipo"),
      status: requireChoice(firstText(formData, "status", 40) || "scheduled", ["scheduled", "in_progress", "completed", "cancelled"], "Status"),
      starts_at: startsAt,
      ends_at: endsAt,
      location: firstText(formData, "location", 220) || null,
      assigned_to: firstText(formData, "assignedTo", 80) || null,
      updated_at: new Date().toISOString(),
    };
    const query = id
      ? db.from("calendar_events").update(payload).eq("id", id).eq("tenant_id", actor.tenantId).eq("organization_id", organization.id).select("id").single()
      : db.from("calendar_events").insert({ ...payload, created_by: actor.appUserId }).select("id").single();
    const { data, error } = await query;
    if (error) throw error;
    await auditOperation(db, {
      actorUserId: actor.appUserId,
      actorName: actor.name,
      actorEmail: actor.email,
      action: id ? "operations.event.update" : "operations.event.create",
      entityType: "calendar_event",
      entityId: data?.id || id,
      organizationId: organization.id,
      changedFields: Object.keys(payload),
    });
    revalidateOperations();
    return { ok: true, message: id ? "Evento atualizado." : "Evento criado." };
  } catch (error) {
    return { ok: false, error: sanitizeError(error) };
  }
}

export async function saveOperationsContentAction(
  _previous: OperationsActionState,
  formData: FormData,
): Promise<OperationsActionState> {
  const db = createSupabaseWriteClient();
  try {
    const actor = await requireOperationsActor(db);
    const organization = await resolveInternalOrganization(db, actor.tenantId, firstText(formData, "companySlug", 80));
    const id = firstText(formData, "id", 80);
    const transition = requireChoice(firstText(formData, "transition", 40) || "draft", ["draft", "review", "approved", "scheduled", "cancelled"], "Transição");
    const title = firstText(formData, "title", 180);
    const messageText = firstText(formData, "messageText", 1600);
    if (!title || !messageText) throw new Error("Informe título e texto do conteúdo.");
    const status = transition === "review" || transition === "approved" || transition === "scheduled" ? "ready" : transition === "cancelled" ? "failed" : "draft";
    const scheduledAt = transition === "scheduled" ? optionalDate(formData, "scheduledAt", "Data de programação") : null;
    if (transition === "scheduled" && !scheduledAt) throw new Error("Data de programação inválida.");
    const metadata = {
      operations: {
        reviewState: transition,
        cancellationReason: transition === "cancelled" ? firstText(formData, "reason", 300) : null,
      },
    };
    const payload = {
      tenant_id: actor.tenantId,
      organization_id: organization.id,
      title,
      message_text: messageText,
      source_type: "manual",
      status,
      scheduled_at: scheduledAt,
      metadata,
      updated_at: new Date().toISOString(),
    };
    const query = id
      ? db.from("content_broadcasts").update(payload).eq("id", id).eq("tenant_id", actor.tenantId).eq("organization_id", organization.id).select("id").single()
      : db.from("content_broadcasts").insert({ ...payload, created_by: actor.appUserId }).select("id").single();
    const { data, error } = await query;
    if (error) throw error;
    await auditOperation(db, {
      actorUserId: actor.appUserId,
      actorName: actor.name,
      actorEmail: actor.email,
      action: id ? "operations.content.update" : "operations.content.create",
      entityType: "content_broadcast",
      entityId: data?.id || id,
      organizationId: organization.id,
      changedFields: Object.keys(payload),
      metadata: { transition },
    });
    revalidateOperations();
    return { ok: true, message: id ? "Conteúdo atualizado." : "Rascunho criado." };
  } catch (error) {
    return { ok: false, error: sanitizeError(error) };
  }
}

export async function updateOperationsAlertAction(
  _previous: OperationsActionState,
  formData: FormData,
): Promise<OperationsActionState> {
  const db = createSupabaseWriteClient();
  try {
    const actor = await requireOperationsActor(db);
    const id = firstText(formData, "id", 80);
    const status = requireChoice(firstText(formData, "status", 40), ["open", "active", "acknowledged", "in_progress", "resolved"], "Status");
    if (!id) throw new Error("Alerta inválido.");
    const internalOrganizationIds = await loadInternalOrganizationIds(db, actor.tenantId);
    const { data: currentAlert, error: currentAlertError } = await db
      .from("system_alerts")
      .select("id, related_entity_id")
      .eq("id", id)
      .single();
    if (currentAlertError) throw currentAlertError;
    if (currentAlert?.related_entity_id && !internalOrganizationIds.has(currentAlert.related_entity_id)) {
      throw new Error("Alerta fora do escopo operacional.");
    }
    const now = new Date().toISOString();
    const payload = {
      status,
      acknowledged_at: status === "acknowledged" || status === "in_progress" || status === "resolved" ? now : null,
      resolved_at: status === "resolved" ? now : null,
      metadata: { operations_note: firstText(formData, "note", 500) },
    };
    const { data, error } = await db
      .from("system_alerts")
      .update(payload)
      .eq("id", id)
      .select("id, related_entity_id")
      .single();
    if (error) throw error;
    await auditOperation(db, {
      actorUserId: actor.appUserId,
      actorName: actor.name,
      actorEmail: actor.email,
      action: "operations.alert.update",
      entityType: "system_alert",
      entityId: data?.id || id,
      organizationId: typeof data?.related_entity_id === "string" ? data.related_entity_id : null,
      changedFields: Object.keys(payload),
    });
    revalidateOperations();
    return { ok: true, message: "Alerta atualizado." };
  } catch (error) {
    return { ok: false, error: sanitizeError(error) };
  }
}
