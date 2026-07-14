import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppContext } from "@/lib/auth/app-context";
import {
  analyzeCommercialConversation,
  buildCommercialContext,
  LIPS_COMMERCIAL_PROFILE,
  suggestCommercialResponse,
  validateCommercialSuggestion,
  type CommercialAnalysis,
  type CommercialAgentProvider,
  type CommercialContext,
  type CommercialSuggestion,
  type CommercialSuggestionStatus,
} from "@/lib/ai/commercial-agent";
import { classifyCatalogQuery, scoreCatalogCandidate } from "@/lib/catalog/lips-classifier";
import { buildConversationContentHash } from "@/lib/ai/commercial-agent/hash";
import { LIPS_ANALYSIS_PROMPT_VERSION } from "@/lib/ai/commercial-agent/prompts/lips-analysis-prompt";
import { LIPS_SUGGESTION_PROMPT_VERSION } from "@/lib/ai/commercial-agent/prompts/lips-suggestion-prompt";
import { estimateCommercialAgentCost } from "@/lib/ai/commercial-agent/model-costs";

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

type CommercialRuntimeOptions = {
  provider?: CommercialAgentProvider;
  model?: string;
};

type PersistMetadata = {
  conversationContentHash: string;
  profileVersion: string;
  promptVersion: string;
  metadata: ReturnType<NonNullable<CommercialAgentProvider["getLastMetadata"]>> | null;
  guardrailReasons?: string[];
};

export async function buildCommercialContextForConversation(
  db: SupabaseClient,
  context: AppContext,
  conversationId: string,
): Promise<CommercialContext> {
  if (!context.organizationId) throw new Error("commercial_agent_organization_required");
  const organizationId = context.organizationId;

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
      .eq("organization_id", organizationId)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(80),
    row.channel_id
      ? db
          .from("channels")
          .select("id, provider, session_id, display_name")
          .eq("id", row.channel_id)
          .eq("tenant_id", context.tenantId)
          .eq("organization_id", organizationId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    db.from("tenants").select("id, name, slug, is_platform").eq("id", context.tenantId).maybeSingle(),
    db.from("organizations").select("id, name, slug").eq("id", organizationId).eq("tenant_id", context.tenantId).maybeSingle(),
  ]);

  if (messagesResult.error) throw messagesResult.error;
  if (channelResult.error) throw channelResult.error;
  if (tenantResult.error) throw tenantResult.error;
  if (organizationResult.error) throw organizationResult.error;

  const profile = {
    ...LIPS_COMMERCIAL_PROFILE,
    tenantId: context.tenantId,
    organizationId,
    enabled: true,
    responseMode: "observer" as const,
  };

  const mappedMessages = ((messagesResult.data as MessageRow[] | null) ?? []).map((message) => ({
    id: message.id,
    direction: message.direction,
    body: message.body ?? null,
    messageType: message.message_type,
    createdAt: message.created_at,
  }));
  const classification = await buildLipsDeterministicClassification(db, context, mappedMessages);

  return buildCommercialContext({
    tenant: {
      id: context.tenantId,
      name: tenantResult.data?.name,
      slug: tenantResult.data?.slug,
      isPlatform: tenantResult.data?.is_platform,
    },
    organization: {
      id: organizationId,
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
    messages: mappedMessages,
    classification,
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
  options: CommercialRuntimeOptions = {},
) {
  const commercialContext = await buildCommercialContextForConversation(db, appContext, conversationId);
  const conversationContentHash = buildConversationContentHash(commercialContext);
  const model = options.model || "deterministic";
  const existing = await readCurrentCommercialAnalysis(db, appContext, conversationId, {
    conversationContentHash,
    profileVersion: commercialContext.profile.id,
    promptVersion: LIPS_ANALYSIS_PROMPT_VERSION,
    model,
  });

  if (existing?.analysis) {
    return { context: commercialContext, analysis: existing.analysis as CommercialAnalysis, analysisId: existing.id, persisted: true, reused: true };
  }

  const analysis = options.provider
    ? await options.provider.analyzeConversation({ context: commercialContext })
    : analyzeCommercialConversation(commercialContext);
  const metadata = options.provider?.getLastMetadata?.() ?? null;
  const persisted = await insertAnalysis(db, appContext, commercialContext, analysis, {
    conversationContentHash,
    profileVersion: commercialContext.profile.id,
    promptVersion: LIPS_ANALYSIS_PROMPT_VERSION,
    metadata,
  });
  return { context: commercialContext, analysis, analysisId: persisted?.id ?? null, persisted: Boolean(persisted), reused: false };
}

export async function suggestAndMaybePersistCommercialResponse(
  db: SupabaseClient,
  appContext: AppContext,
  conversationId: string,
  options: CommercialRuntimeOptions = {},
) {
  const { context, analysis, analysisId } = await analyzeAndMaybePersistCommercialConversation(db, appContext, conversationId, options);
  const conversationContentHash = buildConversationContentHash(context);
  const suggestion = options.provider
    ? await options.provider.suggestResponse({ context, analysis })
    : suggestCommercialResponse(context, analysis);
  const guarded = validateCommercialSuggestion(context, suggestion);
  const safeSuggestion = guarded.safe && guarded.suggestion
    ? guarded.suggestion
    : {
        text: "Sugestão bloqueada por regra comercial. Encaminhe para atendimento humano antes de responder.",
        requiresApproval: true as const,
        sources: [{ type: "rule" as const, reference: "commercial_guardrails" }],
        warnings: guarded.warnings,
      };
  const metadata = options.provider?.getLastMetadata?.() ?? null;
  const persisted = await insertSuggestion(db, appContext, context, analysisId, safeSuggestion, {
    conversationContentHash,
    profileVersion: context.profile.id,
    promptVersion: LIPS_SUGGESTION_PROMPT_VERSION,
    metadata,
    guardrailReasons: guarded.safe ? [] : guarded.warnings,
  });
  return { context, analysis, suggestion: safeSuggestion, suggestionId: persisted?.id ?? null, persisted: Boolean(persisted) };
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

async function insertAnalysis(
  db: SupabaseClient,
  appContext: AppContext,
  context: CommercialContext,
  analysis: CommercialAnalysis,
  runtime: PersistMetadata,
) {
  const cost = runtime.metadata ? estimateCommercialAgentCost({
    model: runtime.metadata.model,
    inputTokens: runtime.metadata.inputTokens,
    outputTokens: runtime.metadata.outputTokens,
  }) : null;

  const { data, error } = await db
    .from("commercial_conversation_analysis")
    .insert({
      tenant_id: appContext.tenantId,
      organization_id: appContext.organizationId,
      channel_id: context.channel?.id ?? null,
      conversation_id: context.conversation.id,
      status: "generated",
      analysis,
      conversation_content_hash: runtime.conversationContentHash,
      profile_version: runtime.profileVersion,
      prompt_version: runtime.promptVersion,
      model: runtime.metadata?.model ?? "deterministic",
      provider: runtime.metadata?.provider ?? "deterministic",
      provider_response_id: runtime.metadata?.providerResponseId ?? null,
      request_status: runtime.metadata?.requestStatus ?? "success",
      latency_ms: runtime.metadata?.latencyMs ?? null,
      input_tokens: runtime.metadata?.inputTokens ?? null,
      output_tokens: runtime.metadata?.outputTokens ?? null,
      total_tokens: runtime.metadata?.totalTokens ?? null,
      estimated_cost_usd: cost,
      guardrail_reasons: runtime.guardrailReasons ?? [],
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
  runtime: PersistMetadata,
) {
  const cost = runtime.metadata ? estimateCommercialAgentCost({
    model: runtime.metadata.model,
    inputTokens: runtime.metadata.inputTokens,
    outputTokens: runtime.metadata.outputTokens,
  }) : null;
  const unsafe = (runtime.guardrailReasons ?? []).length > 0;

  const { data, error } = await db
    .from("commercial_response_suggestions")
    .insert({
      tenant_id: appContext.tenantId,
      organization_id: appContext.organizationId,
      channel_id: context.channel?.id ?? null,
      conversation_id: context.conversation.id,
      analysis_id: analysisId,
      status: unsafe ? "unsafe_suggestion" : "draft",
      suggestion,
      conversation_content_hash: runtime.conversationContentHash,
      profile_version: runtime.profileVersion,
      prompt_version: runtime.promptVersion,
      model: runtime.metadata?.model ?? "deterministic",
      provider: runtime.metadata?.provider ?? "deterministic",
      provider_response_id: runtime.metadata?.providerResponseId ?? null,
      request_status: runtime.metadata?.requestStatus ?? "success",
      latency_ms: runtime.metadata?.latencyMs ?? null,
      input_tokens: runtime.metadata?.inputTokens ?? null,
      output_tokens: runtime.metadata?.outputTokens ?? null,
      total_tokens: runtime.metadata?.totalTokens ?? null,
      estimated_cost_usd: cost,
      guardrail_reasons: runtime.guardrailReasons ?? [],
      created_by: appContext.appUserId,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (isMissingTable(error)) return null;
  if (error) throw error;
  return data;
}

async function readCurrentCommercialAnalysis(
  db: SupabaseClient,
  appContext: AppContext,
  conversationId: string,
  input: { conversationContentHash: string; profileVersion: string; promptVersion: string; model: string },
) {
  const { data, error } = await db
    .from("commercial_conversation_analysis")
    .select("id, analysis")
    .eq("tenant_id", appContext.tenantId)
    .eq("organization_id", appContext.organizationId)
    .eq("conversation_id", conversationId)
    .eq("conversation_content_hash", input.conversationContentHash)
    .eq("profile_version", input.profileVersion)
    .eq("prompt_version", input.promptVersion)
    .eq("model", input.model)
    .eq("status", "generated")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (isMissingTable(error) || error?.code === "42703") return null;
  if (error) throw error;
  return data ?? null;
}

async function buildLipsDeterministicClassification(db: SupabaseClient, context: AppContext, messages: Array<{ body: string | null; direction: string }>) {
  const lastInbound = [...messages].reverse().find((message) => message.direction === "inbound" && message.body)?.body ?? "";
  const query = classifyCatalogQuery(lastInbound);
  const candidates = await searchCatalogCandidates(db, context, lastInbound);
  const scored = candidates
    .map((candidate) => ({ candidate, score: scoreCatalogCandidate({ id: candidate.id, name: candidate.name, price: candidate.price, stock_quantity: candidate.stockQuantity }, query) }))
    .sort((a, b) => b.score.confidence - a.score.confidence)
    .slice(0, 5);
  const best = scored[0];
  const safeMatch = best && best.score.confidence >= 0.75 && best.score.familyMatch ? best.candidate : null;

  return {
    intent: query.family ? "parts_quote" : null,
    family: query.family,
    vehicle: query.vehicle,
    year: query.year,
    safeMatch,
    catalogCandidates: scored.map((item) => ({ ...item.candidate, confidence: item.score.confidence, safeMatch: item.candidate.id === safeMatch?.id, reasons: item.score.reasons })),
    price: safeMatch?.price ?? null,
    stockStatus: safeMatch ? stockStatusFromQuantity(safeMatch.stockQuantity) : null,
    missingFields: query.missingRequiredFields,
  };
}

async function searchCatalogCandidates(db: SupabaseClient, context: AppContext, text: string) {
  if (!context.organizationId) throw new Error("commercial_agent_organization_required");

  const terms = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 4)
    .slice(0, 6);

  if (terms.length === 0) return [];

  const { data } = await db
    .from("catalog_items")
    .select("id, name, sku, brand, price, stock_available")
    .eq("tenant_id", context.tenantId)
    .eq("organization_id", context.organizationId)
    .eq("status", "active")
    .or(terms.map((term) => `name.ilike.%${term}%`).join(","))
    .limit(20);

  return ((data ?? []) as Array<{ id: string; name: string; price: number | null; stock_available: number | null }>).map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    stockQuantity: item.stock_available,
  }));
}

function stockStatusFromQuantity(value?: number | null) {
  if (typeof value !== "number") return "unknown" as const;
  if (value > 0) return "available" as const;
  if (value === 0) return "unavailable" as const;
  return "confirm" as const;
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
