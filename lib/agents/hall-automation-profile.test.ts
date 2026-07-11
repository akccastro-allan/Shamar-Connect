import assert from "node:assert/strict";
import { test } from "node:test";

import { hallAutomationProfile, hallMenuMessage } from "./hall-automation-profile.ts";

test("Hall profile stays disabled until explicit activation", () => {
  assert.equal(hallAutomationProfile.enabled, false);
  assert.equal(hallAutomationProfile.safeAutoReply, true);
  assert.equal(hallAutomationProfile.catalogEnabled, true);
});

test("Hall menu matches commercial flow", () => {
  assert.match(hallMenuMessage, /Ver produtos e valores/);
  assert.match(hallMenuMessage, /Fazer uma encomenda/);
  assert.match(hallMenuMessage, /Consultar retirada ou entrega/);
  assert.match(hallMenuMessage, /Falar com atendimento/);
});

test("Hall profile blocks order confirmation, reservation and payment", () => {
  assert.ok(hallAutomationProfile.blockedActions.includes("confirmar encomenda"));
  assert.ok(hallAutomationProfile.blockedActions.includes("reservar produto"));
  assert.ok(hallAutomationProfile.blockedActions.includes("enviar PIX"));
  assert.ok(hallAutomationProfile.blockedActions.includes("fechar pagamento"));
  assert.ok(hallAutomationProfile.handoffRules.some((rule) => rule.intent === "payment_or_reservation"));
});
