import assert from "node:assert/strict";
import test from "node:test";
import type { AppContext } from "../../auth/app-context.ts";
import { canAccessCommandCenter } from "../../features/feature-flags.ts";
import {
  buildCommercialContext,
  LIPS_COMMERCIAL_PROFILE,
  analyzeCommercialConversation,
  buildConversationContentHash,
  buildSafetyIdentifier,
  commercialAnalysisSchema,
  commercialSuggestionSchema,
  estimateCommercialAgentCost,
  observerModeBlocksSending,
  suggestCommercialResponse,
  validateCommercialSuggestion,
  type CommercialContext,
  type CommercialSuggestion,
} from "./index.ts";
import { OpenAICommercialAgentProvider } from "./providers/openai-commercial-agent-provider.ts";

function lipsContext(overrides: Partial<CommercialContext> = {}): CommercialContext {
  const profile = {
    ...LIPS_COMMERCIAL_PROFILE,
    tenantId: "tenant-lips",
    organizationId: "org-lips",
  };

  return {
    tenant: { id: "tenant-lips", name: "Lips", isPlatform: false },
    organization: { id: "org-lips", name: "Lips" },
    channel: { id: "channel-lips", provider: "whatsapp_web", sessionId: "lips-main" },
    conversation: { id: "conversation-lips", status: "open", stage: "novo", isGroup: false },
    contact: { id: "contact-1", name: "Cliente", tags: [] },
    messages: [
      { id: "msg-1", direction: "inbound", body: "Preciso de pastilha do Corolla 2015, tem pra hoje?", createdAt: "2026-07-13T10:00:00.000Z" },
    ],
    classification: {
      intent: "parts_quote",
      family: "pastilha_freio",
      vehicle: "corolla",
      year: 2015,
      safeMatch: { id: "sku-1", name: "PAST FREIO DIANT COROLLA 14/19", price: 120, stockQuantity: 2, safeMatch: true },
      catalogCandidates: [{ id: "sku-1", name: "PAST FREIO DIANT COROLLA 14/19", price: 120, stockQuantity: 2, safeMatch: true }],
      price: 120,
      stockStatus: "available",
      missingFields: [],
    },
    assignment: null,
    department: null,
    currentStage: null,
    profile,
    ...overrides,
  };
}

function platformContext(overrides: Partial<AppContext> = {}): AppContext {
  return {
    tenantId: "tenant-platform",
    organizationId: "org-platform",
    appUserId: "user-1",
    tenantUserId: "tenant-user-1",
    role: "owner",
    email: "admin@example.com",
    name: "Admin",
    isPlatformTenant: true,
    ...overrides,
  };
}

test("perfil correto por organização usa Lips em observer", () => {
  const context = lipsContext();

  assert.equal(context.profile.businessName, "Lips Comercial");
  assert.equal(context.profile.responseMode, "observer");
  assert.equal(context.profile.pricingAuthority, "catalog");
  assert.equal(context.profile.stockAuthority, "catalog");
});

test("contexto não cruza tenants nem organizações", () => {
  assert.throws(() => buildCommercialContext({
    ...lipsContext(),
    tenant: { id: "tenant-moriah" },
  }), /commercial_context_profile_scope_mismatch/);

  assert.throws(() => buildCommercialContext({
    ...lipsContext(),
    organization: { id: "org-moriah" },
  }), /commercial_context_profile_scope_mismatch/);
});

test("Lips usa catálogo como autoridade factual", () => {
  const context = lipsContext();
  const analysis = analyzeCommercialConversation(context);
  const suggestion = suggestCommercialResponse(context, analysis);

  assert.match(suggestion.text, /R\$ 120,00/);
  assert.equal(suggestion.sources.some((source) => source.type === "catalog" && source.reference === "sku-1"), true);
  assert.equal(suggestion.requiresApproval, true);
});

test("IA não altera preço fora do catálogo", () => {
  const context = lipsContext();
  const unsafe: CommercialSuggestion = {
    text: "Consigo fazer por R$ 90,00 e fechar agora.",
    requiresApproval: true,
    sources: [{ type: "profile", reference: context.profile.id }],
    warnings: [],
  };

  const result = validateCommercialSuggestion(context, unsafe);
  assert.equal(result.safe, false);
  assert.equal(result.status, "unsafe_suggestion");
  assert.equal(result.warnings.includes("invented_or_modified_price"), true);
});

test("IA não promete estoque, PIX, reserva ou agenda", () => {
  const context = lipsContext();
  const unsafeTexts = [
    "Temos em estoque garantido, pode retirar.",
    "Pode pagar no PIX pela chave agora.",
    "Deixei reservado para você.",
    "Agenda confirmada para amanhã.",
  ];

  for (const text of unsafeTexts) {
    const result = validateCommercialSuggestion(context, {
      text,
      requiresApproval: true,
      sources: [{ type: "rule", reference: "test" }],
      warnings: [],
    });

    assert.equal(result.safe, false, text);
  }
});

test("observer não envia mensagem e sugestão sempre requer aprovação", () => {
  const context = lipsContext();
  const analysis = analyzeCommercialConversation(context);
  const suggestion = suggestCommercialResponse(context, analysis);

  assert.equal(observerModeBlocksSending(context), true);
  assert.equal(suggestion.requiresApproval, true);
  assert.equal(suggestion.warnings.includes("observer_mode_no_send"), true);
});

test("empresa interna não acessa dados Lips por contexto", () => {
  const internalProfile = { ...LIPS_COMMERCIAL_PROFILE, tenantId: "tenant-platform", organizationId: "org-platform" };

  assert.throws(() => buildCommercialContext({
    ...lipsContext({ profile: internalProfile }),
    tenant: { id: "tenant-lips" },
    organization: { id: "org-lips" },
  }), /commercial_context_profile_scope_mismatch/);
});

test("cliente Lips não acessa Centro de Comando", () => {
  const lipsUser = platformContext({ tenantId: "tenant-lips", organizationId: "org-lips", isPlatformTenant: false });
  assert.equal(canAccessCommandCenter(lipsUser, { features: { command_center: true } }), false);
});

test("schemas rejeitam saída sem aprovação humana obrigatória", () => {
  assert.throws(() => commercialSuggestionSchema.parse({
    text: "Resposta pronta para enviar.",
    callToAction: null,
    requiresApproval: false,
    sources: [{ type: "profile", reference: "lips" }],
    warnings: [],
  }));

  const parsed = commercialAnalysisSchema.parse({
    intent: "cotacao_peca",
    stage: "qualifying",
    temperature: "warm",
    confidence: 0.83,
    objections: [],
    missingInformation: ["placa"],
    recommendedNextAction: "Pedir placa para confirmar aplicação.",
    recommendedDepartment: null,
    requiresHuman: true,
    riskFlags: [],
    summary: "Cliente quer cotação, mas falta confirmar aplicação.",
  });

  assert.equal(parsed.recommendedDepartment, undefined);
});

test("hash de conversa é determinístico e muda com conteúdo", () => {
  const context = lipsContext();
  const firstHash = buildConversationContentHash(context);
  const secondHash = buildConversationContentHash(lipsContext());
  const changedHash = buildConversationContentHash(lipsContext({
    messages: [{ id: "msg-1", direction: "inbound", body: "Mudou a mensagem", createdAt: context.messages[0].createdAt }],
  }));

  assert.match(firstHash, /^[a-f0-9]{64}$/);
  assert.equal(firstHash, secondHash);
  assert.notEqual(firstHash, changedHash);
});

test("safety identifier não expõe tenant nem usuário", () => {
  const identifier = buildSafetyIdentifier({ tenantId: "tenant-lips", userId: "allan@example.com" });

  assert.match(identifier, /^[a-f0-9]{64}$/);
  assert.equal(identifier.includes("tenant-lips"), false);
  assert.equal(identifier.includes("allan"), false);
});

test("custo estimado usa tabela versionada e retorna null para modelo desconhecido", () => {
  assert.equal(estimateCommercialAgentCost({ model: "gpt-4.1-mini", inputTokens: 1000, outputTokens: 500 }), 0.0012);
  assert.equal(estimateCommercialAgentCost({ model: "modelo-desconhecido", inputTokens: 1000, outputTokens: 500 }), null);
});

test("provider OpenAI falha fechado sem feature flag ou credenciais", () => {
  assert.throws(() => new OpenAICommercialAgentProvider({
    enabled: false,
    apiKey: "key",
    model: "gpt-4.1-mini",
    tenantId: "tenant-lips",
    userId: "user-1",
  }), /feature_unavailable/);

  assert.throws(() => new OpenAICommercialAgentProvider({
    enabled: true,
    apiKey: undefined,
    model: "gpt-4.1-mini",
    tenantId: "tenant-lips",
    userId: "user-1",
  }), /feature_unavailable/);
});
