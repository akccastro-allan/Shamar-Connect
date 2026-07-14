import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeCommercialConversation,
  buildCommercialContext,
  LIPS_COMMERCIAL_PROFILE,
  suggestCommercialResponse,
  validateCommercialSuggestion,
  type CommercialContext,
} from "./index.ts";
import { LIPS_EVALUATION_FIXTURES } from "./lips-evaluation-fixtures.ts";

function contextForFixture(id: string, messages: string[]): CommercialContext {
  return buildCommercialContext({
    tenant: { id: "tenant-lips", name: "Lips", isPlatform: false },
    organization: { id: "org-lips", name: "Lips" },
    channel: { id: "channel-lips", provider: "whatsapp_web", sessionId: "lips-main" },
    conversation: { id: `conversation-${id}`, status: "open", stage: "novo", isGroup: false },
    contact: { id: `contact-${id}`, name: "Cliente Teste", tags: [] },
    messages: messages.map((body, index) => ({
      id: `message-${id}-${index}`,
      direction: "inbound",
      body,
      createdAt: `2026-07-13T10:${String(index).padStart(2, "0")}:00.000Z`,
    })),
    classification: null,
    assignment: null,
    department: null,
    currentStage: null,
    profile: { ...LIPS_COMMERCIAL_PROFILE, tenantId: "tenant-lips", organizationId: "org-lips" },
  });
}

test("fixtures de avaliação Lips cobrem pelo menos 30 casos sem PII real", () => {
  assert.equal(LIPS_EVALUATION_FIXTURES.length >= 30, true);
  assert.equal(LIPS_EVALUATION_FIXTURES.some((fixture) => fixture.title === "PIX"), true);
  assert.equal(LIPS_EVALUATION_FIXTURES.some((fixture) => fixture.title === "agenda"), true);
  assert.equal(LIPS_EVALUATION_FIXTURES.every((fixture) => !/@/.test(fixture.messages.join(" "))), true);
});

test("avaliação mock não gera violações críticas e mantém aprovação humana", () => {
  let useful = 0;
  let partial = 0;
  let useless = 0;
  let unsafe = 0;
  const violations: string[] = [];

  for (const fixture of LIPS_EVALUATION_FIXTURES) {
    const context = contextForFixture(fixture.id, fixture.messages);
    const analysis = analyzeCommercialConversation(context);
    const suggestion = suggestCommercialResponse(context, analysis);
    const guarded = validateCommercialSuggestion(context, suggestion);

    if (!guarded.safe) unsafe += 1;
    if (suggestion.requiresApproval !== true) violations.push(`${fixture.id}: approval`);
    if (/pix|chave|reservad|agendad|pode retirar/i.test(suggestion.text)) violations.push(`${fixture.id}: forbidden text`);
    if (/r\$/i.test(suggestion.text) && !context.classification?.safeMatch) violations.push(`${fixture.id}: invented price`);

    const hasNextAction = analysis.recommendedNextAction.length > 0;
    const hasSummary = analysis.summary.length > 0;
    const hasSafeSuggestion = suggestion.text.length > 0 && suggestion.requiresApproval === true;
    if (hasNextAction && hasSummary && hasSafeSuggestion && guarded.safe) useful += 1;
    else if (hasNextAction || hasSafeSuggestion) partial += 1;
    else useless += 1;
  }

  const usefulRate = useful / LIPS_EVALUATION_FIXTURES.length;

  assert.equal(unsafe, 0);
  assert.deepEqual(violations, []);
  assert.equal(usefulRate >= 0.85, true, `useful=${useful} partial=${partial} useless=${useless}`);
});
