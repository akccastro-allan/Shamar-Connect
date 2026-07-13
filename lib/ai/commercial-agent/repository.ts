import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppContext } from "@/lib/auth/app-context";
import {
  analyzeCommercialConversation,
  buildCommercialContext,
  LIPS_COMMERCIAL_PROFILE,
  suggestCommercialResponse,
  type CommercialAnalysis,
  type CommercialContext,
  type CommercialSuggestion,
  type CommercialSuggestionStatus,
} from "@/lib/ai/commercial-agent";

const TABLE_MISSING_CODES = new Set(["42P01", "PGRST205"]);

type ConversationRow = {
  id: string;
  tenant_id: string;
  organization_id: string;
  channel_id?: string | null;
  status?: string | null;
  stage?: string | null;
  priority?: string | null;
  is_group?: boolean | null;
  crm_contacts?: { id?: string | null; name?: string | null; company?: string | null; tags?: string[] | null } | null;
};

type MessageRow = {
  id: string;
  direction: "inbound" | "outbound";
  body?: string | null;
  message_type?: string | null;
  created_at: string;
};

type ChannelRow = {
  id: string;
  provider?: string | null;
  session_id?: string | null;
  display_name?: string | null;
};

export async function buildCommercialContextForConversation(
  db: SupabaseClient,
  context: AppContext,
  conversationId: string,
): Promise<CommercialContext> {
  const { data: conversation, error: conversationError } = await db
    .from("whatsapp_conversations")
    .select("id, tenant_id, organization_id, channel_id, status, stage, priority, is_group, crm_contacts(id, name, company, tags)")
    .eq("id", conversationId)
    .eq("tenant_id", context.tenantId)
    .eq("organization_id", context.organizationId)
    .maybeSingle();

  if (conversationError) throw conversationError;
  if (!conversation) throw new Error("commercial_conversation_not_found");

  const row = conversation as ConversationRow;
  const [messagesResult, channelResult, tenantResult, organizationResult] = await Promise.all([
    db
      .from("whatsapp_messages")
      .select("id, direction, body, message_type, created_at")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(80),
    row.channel_id
      ? db
          .from("channels")
          .select("id, provider, session_id, display_name")
          .eq("id", row.channel_id)
          .eq("tenant_id", context.tenantId)
          .eq("organization_id", context.organizationId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    db.from("tenants").select("id, name, slug, is_platform").eq("id", context.tenantId).maybeSingle(),
    db.from("organizations").select("id, name, slug").eq("id", context.organizationId).eq("tenant_id", context.tenantId).maybeSingle(),
  ]);

  if (messagesResult.error) throw messagesResult.error;
  if (channelResult.error) throw channelResult.error;
  if (tenantResult.error) throw tenantResult.error;
  if (organizationResult.error) throw organizationResult.error;

  const profile = {
    ...LIPS_COMMERCIAL_PROFILE,
    tenantId: context.tenantId,
    organizationId: context.organizationId,
    enabled: true,
    responseMode: "observer" as const,
  };

  return buildCommercialContext({
    tenant: {
      id: context.tenantId,
      name: tenantResult.data?.name,
      slug: tenantResult.data?.slug,
      isPlatform: tenantResult.data?.is_platform,
    },
    organization: {
      id: context.organizationId,
      name: organizationResult.data?.name,
      slug: organizationResult.data?.slug,
    },
    channel: channelResult.data ? mapChannel(channelResult.data as ChannelRow) : null,
    conversation: {
      id: row.id,
      status: row.status,
      stage: row.stage,
      priority: row.priority,
      isGroup: row.is_group,
    },
    contact: row.crm_contacts ?? null,
    messages: ((messagesResult.data as MessageRow[] | null) ?? []).map((message) => ({
      id: message.id,
      direction: message.direction,
      body: message.body ?? null,
      messageType: message.message_type,
      createdAt: message.created_at,
    })),
    classification: null,
    assignment: null,
    department: null,
    currentStage: null,
    profile,
  });
}

export async function analyzeAndMaybePersistCommercialConversation(
  db: SupabaseClient,
  appContext: AppContext,
  conversationId: string,
) {
  const commercialContext = await buildCommercialContextForConversation(db, appContext, conversationId);
  const analysis = analyzeCommercialConversation(commercialContext);
  const persisted = await insertAnalysis(db, appContext, commercialContext, analysis);
  return { context: commercialContext, analysis, analysisId: persisted?.id ?? null, persisted: Boolean(persisted) };
}

export async function suggestAndMaybePersistCommercialResponse(
  db: SupabaseClient,
  appContext: AppContext,
  conversationId: string,
) {
  const { context, analysis, analysisId } = await analyzeAndMaybePersistCommercialConversation(db, appContext, conversationId);
  const suggestion = suggestCommercialResponse(context, analysis);
  const persisted = await insertSuggestion(db, appContext, context, analysisId, suggestion);
  return { context, analysis, suggestion, suggestionId: persisted?.id ?? null, persisted: Boolean(persisted) };
}

export async function readLatestCommercialAnalysis(db: SupabaseClient, appContext: AppContext, conversationId: string) {
  const { data, error } = await db
    .from("commercial_conversation_analysis")
    .select("id, status, analysis, created_at, updated_at")
    .eq("tenant_id", appContext.tenantId)
    .eq("organization_id", appContext.organizationId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (isMissingTable(error)) return null;
  if (error) throw error;
  return data ?? null;
}

export async function updateCommercialSuggestionStatus(
  db: SupabaseClient,
  appContext: AppContext,
  suggestionId: string,
  status: Extract<CommercialSuggestionStatus, "approved" | "edited" | "rejected" | "expired">,
  patch: { editedText?: string; rejectionReason?: string },
) {
  const { data, error } = await db
    .from("commercial_response_suggestions")
    .update({
      status,
      edited_text: patch.editedText ?? null,
      rejection_reason: patch.rejectionReason ?? null,
      reviewed_by: appContext.appUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", suggestionId)
    .eq("tenant_id", appContext.tenantId)
    .eq("organization_id", appContext.organizationId)
    .select("id, status")
    .maybeSingle();

  if (isMissingTable(error)) throw new Error("commercial_agent_tables_not_applied");
  if (error) throw error;
  if (!data) throw new Error("commercial_suggestion_not_found");
  return data;
}

async function insertAnalysis(db: SupabaseClient, appContext: AppContext, context: CommercialContext, analysis: CommercialAnalysis) {
  const { data, error } = await db
    .from("commercial_conversation_analysis")
    .insert({
      tenant_id: appContext.tenantId,
      organization_id: appContext.organizationId,
      channel_id: context.channel?.id ?? null,
      conversation_id: context.conversation.id,
      status: "generated",
      analysis,
      created_by: appContext.appUserId,
    })
    .select("id")
    .maybeSingle();

  if (isMissingTable(error)) return null;
  if (error) throw error;
  return data;
}

async function insertSuggestion(
  db: SupabaseClient,
  appContext: AppContext,
  context: CommercialContext,
  analysisId: string | null,
  suggestion: CommercialSuggestion,
) {
  const { data, error } = await db
    .from("commercial_response_suggestions")
    .insert({
      tenant_id: appContext.tenantId,
      organization_id: appContext.organizationId,
      channel_id: context.channel?.id ?? null,
      conversation_id: context.conversation.id,
      analysis_id: analysisId,
      status: suggestion.warnings.includes("unsafe_suggestion") ? "unsafe_suggestion" : "draft",
      suggestion,
      created_by: appContext.appUserId,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (isMissingTable(error)) return null;
  if (error) throw error;
  return data;
}

function mapChannel(row: ChannelRow) {
  return {
    id: row.id,
    provider: row.provider,
    sessionId: row.session_id,
    displayName: row.display_name,
  };
}

function isMissingTable(error: { code?: string | null } | null) {
  return Boolean(error?.code && TABLE_MISSING_CODES.has(error.code));
}
