import { resolveSessionClient } from "@/lib/providers/resolve-session";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { LIPS_CHANNEL_ID, LIPS_ORGANIZATION_ID, LIPS_SESSION_ID } from "@/lib/admin/command-center-config";

export type LipsLiveStatus = {
  channel: {
    id: string;
    provider: string | null;
    provider_type: string | null;
    session_id: string | null;
    external_instance: string | null;
    slug: string | null;
    is_active: boolean | null;
  } | null;
  channelError: string | null;
  gateway: { online: boolean; status: string; phone: string | null; error: string | null };
  lastMessages: Array<{
    id: string;
    direction: string | null;
    body: string | null;
    provider: string | null;
    conversation_id: string | null;
    channel_id: string | null;
    created_at: string | null;
  }>;
  messagesError: string | null;
  lastProviderEvents: Array<{
    id: string;
    processing_status: string | null;
    provider: string | null;
    external_event_id: string | null;
    channel_id: string | null;
    created_at: string | null;
  }>;
  providerEventsError: string | null;
  lastAutomationJobs: Array<{
    id: string;
    status: string | null;
    agent_type: string | null;
    response_type: string | null;
    sent_to_evolution: boolean | null;
    error_message: string | null;
    created_at: string | null;
  }>;
  jobsError: string | null;
  lastCooldowns: Array<{
    id: string;
    conversation_id: string | null;
    last_automated_response_at: string | null;
    last_response_text: string | null;
  }>;
  cooldownError: string | null;
  pendingConversations: number;
  messages24h: number;
  pendingJobs: number;
  errorJobs: number;
  lastConversationAt: string | null;
};

async function safeQuery<T>(fallback: T, query: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  try {
    const result = await query;
    if (result.error) return { data: fallback, error: result.error.message };
    return { data: result.data ?? fallback, error: null };
  } catch (error) {
    return { data: fallback, error: error instanceof Error ? error.message : "Erro ao consultar dados." };
  }
}

async function safeCount(query: PromiseLike<{ count: number | null; error: { message: string } | null }>) {
  try {
    const result = await query;
    if (result.error) return { count: 0, error: result.error.message };
    return { count: result.count ?? 0, error: null };
  } catch (error) {
    return { count: 0, error: error instanceof Error ? error.message : "Erro ao contar dados." };
  }
}

async function getGatewayStatus() {
  const resolved = resolveSessionClient(LIPS_SESSION_ID);
  if (!resolved) return { online: false, status: "sessão inválida", phone: null, error: "Sessão não permitida." };

  try {
    const status = (await resolved.client.getStatus()) as { status?: string; phone?: string } | null;
    return { online: true, status: status?.status || "online", phone: status?.phone || null, error: null };
  } catch (error) {
    return { online: false, status: "indisponível", phone: null, error: error instanceof Error ? error.message : "Gateway indisponível." };
  }
}

export async function getLipsLiveStatus(): Promise<LipsLiveStatus> {
  const db = createSupabaseWriteClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    channel,
    gateway,
    messages,
    providerEvents,
    jobs,
    cooldowns,
    pendingConversations,
    messages24h,
    pendingJobs,
    errorJobs,
    lastConversation,
  ] = await Promise.all([
    safeQuery(
      null,
      db
        .from("channels")
        .select("id, provider, provider_type, session_id, external_instance, slug, is_active")
        .eq("slug", LIPS_SESSION_ID)
        .maybeSingle(),
    ),
    getGatewayStatus(),
    safeQuery(
      [],
      db
        .from("whatsapp_messages")
        .select("id, direction, body, provider, conversation_id, channel_id, created_at")
        .eq("organization_id", LIPS_ORGANIZATION_ID)
        .order("created_at", { ascending: false })
        .limit(20),
    ),
    safeQuery(
      [],
      db
        .from("provider_events")
        .select("id, processing_status, provider, external_event_id, channel_id, created_at")
        .eq("provider", "openwa")
        .order("created_at", { ascending: false })
        .limit(10),
    ),
    safeQuery(
      [],
      db
        .from("agent_automation_jobs")
        .select("id, status, agent_type, response_type, sent_to_evolution, error_message, created_at")
        .eq("organization_id", LIPS_ORGANIZATION_ID)
        .order("created_at", { ascending: false })
        .limit(20),
    ),
    safeQuery(
      [],
      db
        .from("agent_automation_cooldown")
        .select("id, conversation_id, last_automated_response_at, last_response_text")
        .eq("organization_id", LIPS_ORGANIZATION_ID)
        .order("last_automated_response_at", { ascending: false })
        .limit(5),
    ),
    safeCount(
      db
        .from("whatsapp_conversations")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", LIPS_ORGANIZATION_ID)
        .eq("requires_human", true),
    ),
    safeCount(
      db
        .from("whatsapp_messages")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", LIPS_ORGANIZATION_ID)
        .gte("created_at", since24h),
    ),
    safeCount(
      db
        .from("agent_automation_jobs")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", LIPS_ORGANIZATION_ID)
        .in("status", ["pending", "queued", "processing"]),
    ),
    safeCount(
      db
        .from("agent_automation_jobs")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", LIPS_ORGANIZATION_ID)
        .in("status", ["error", "failed"]),
    ),
    safeQuery(
      null,
      db
        .from("whatsapp_conversations")
        .select("last_message_at")
        .eq("organization_id", LIPS_ORGANIZATION_ID)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
    ),
  ]);

  return {
    channel: channel.data,
    channelError: channel.error,
    gateway,
    lastMessages: messages.data,
    messagesError: messages.error,
    lastProviderEvents: providerEvents.data,
    providerEventsError: providerEvents.error,
    lastAutomationJobs: jobs.data,
    jobsError: jobs.error,
    lastCooldowns: cooldowns.data,
    cooldownError: cooldowns.error,
    pendingConversations: pendingConversations.count,
    messages24h: messages24h.count,
    pendingJobs: pendingJobs.count,
    errorJobs: errorJobs.count,
    lastConversationAt: (lastConversation.data as { last_message_at?: string | null } | null)?.last_message_at ?? null,
  };
}

export function isLipsChannelValidated(channel: LipsLiveStatus["channel"]) {
  return channel?.id === LIPS_CHANNEL_ID && channel?.provider === "openwa" && channel?.session_id === LIPS_SESSION_ID;
}
