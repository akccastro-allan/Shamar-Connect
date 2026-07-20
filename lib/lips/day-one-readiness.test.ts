import assert from "node:assert/strict";
import test from "node:test";
import {
  LIPS_ACTIVATION_CONFIRMATION,
  LIPS_DAY_ONE_QUICK_REPLIES,
  LIPS_OFFICIAL_PHONE_MASKED,
  canPreflightActivateLipsOfficialSession,
  canShowLipsOfficialQr,
  evaluateLipsOfficialSession,
  isLipsOfficialPhone,
  isUnassignedConversation,
  maskLipsPhone,
  sanitizeAuditMetadata,
} from "./day-one-readiness.ts";

test("telefone oficial da Lips é validado e sempre mascarado na UI", () => {
  assert.equal(isLipsOfficialPhone("+55 (21) 3394-6108"), true);
  assert.equal(maskLipsPhone("552133946108"), LIPS_OFFICIAL_PHONE_MASKED);
  assert.equal(maskLipsPhone("5521999998888"), "5521***8888");
});

test("sessão ready com número errado bloqueia ativação", () => {
  const result = evaluateLipsOfficialSession({ status: "ready", phone: "5521999998888" });
  assert.equal(result.valid, false);
  assert.equal(result.state, "numero_incorreto");
  assert.equal(result.phoneMasked, "5521***8888");
});

test("sessão ready com 6108 permite preflight quando demais gates estão corretos", () => {
  const result = canPreflightActivateLipsOfficialSession({
    confirmation: LIPS_ACTIVATION_CONFIRMATION,
    sessionStatus: "ready",
    phone: "552133946108",
    tenantId: "e6abeaae-29fc-4186-b56a-361a69cb846d",
    organizationId: "8f074193-bf58-4537-9842-720619a9f259",
    channelId: "1f65f8d2-2609-42d9-ae57-709aecdb43da",
    noActiveRuns: true,
    noLocks: true,
    featureExecute: false,
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.blockers, []);
});

test("confirmação incorreta e feature execute ativa bloqueiam cutover", () => {
  const result = canPreflightActivateLipsOfficialSession({
    confirmation: "ATIVAR",
    sessionStatus: "ready",
    phone: "552133946108",
    tenantId: "e6abeaae-29fc-4186-b56a-361a69cb846d",
    organizationId: "8f074193-bf58-4537-9842-720619a9f259",
    channelId: "1f65f8d2-2609-42d9-ae57-709aecdb43da",
    noActiveRuns: true,
    noLocks: true,
    featureExecute: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.blockers.includes("confirmacao_incorreta"), true);
  assert.equal(result.blockers.includes("feature_execute_deve_permanecer_false"), true);
});

test("QR do número oficial só é exibível para operador global com aparelho presente", () => {
  assert.equal(canShowLipsOfficialQr({ isGlobalOperator: true, appliancePresent: true, featureExecute: false }), true);
  assert.equal(canShowLipsOfficialQr({ isGlobalOperator: false, appliancePresent: true, featureExecute: false }), false);
  assert.equal(canShowLipsOfficialQr({ isGlobalOperator: true, appliancePresent: false, featureExecute: false }), false);
  assert.equal(canShowLipsOfficialQr({ isGlobalOperator: true, appliancePresent: true, featureExecute: true }), false);
});

test("queue_status null aparece como não atribuída", () => {
  assert.equal(isUnassignedConversation({ queue_status: null, assigned_to: null, assigned_user_id: null }), true);
  assert.equal(isUnassignedConversation({ queue_status: "waiting", assigned_to: null, assigned_user_id: null }), true);
  assert.equal(isUnassignedConversation({ queue_status: "resolved", assigned_to: null, assigned_user_id: null }), false);
  assert.equal(isUnassignedConversation({ queue_status: null, assigned_to: "user-1", assigned_user_id: null }), false);
});

test("respostas rápidas do primeiro dia são manuais e não automáticas", () => {
  assert.equal(LIPS_DAY_ONE_QUICK_REPLIES.length, 6);
  for (const reply of LIPS_DAY_ONE_QUICK_REPLIES) {
    assert.equal(reply.category, "lips");
    assert.equal(reply.tags.includes("primeiro-dia"), true);
    assert.equal(/autom[aá]tic/i.test(reply.body), false);
  }
});

test("auditoria sanitizada remove secrets, QR, URL privada e telefone completo", () => {
  const result = sanitizeAuditMetadata({
    action: "activate_lips_official_session",
    token: "secret-token",
    qrCode: "data:image/png;base64,abc",
    baseUrl: "https://private.example.com",
    phone: "552133946108",
  });
  assert.equal(result.action, "activate_lips_official_session");
  assert.equal("token" in result, false);
  assert.equal("qrCode" in result, false);
  assert.equal("baseUrl" in result, false);
  assert.equal(result.phone, "[phone-redacted]");
});
