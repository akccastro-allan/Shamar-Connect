import assert from "node:assert/strict";
import { test } from "node:test";

import { nutriflowDemoMenuMessage, nutriflowDemoProfile } from "./nutriflow-demo-profile.ts";

test("NutriFlow demo profile is disabled and clearly marked as demo", () => {
  assert.equal(nutriflowDemoProfile.enabled, false);
  assert.match(nutriflowDemoProfile.personaLabel, /Demonstração/);
});

test("NutriFlow demo menu covers the commercial walkthrough", () => {
  assert.match(nutriflowDemoMenuMessage, /Conhecer serviços/);
  assert.match(nutriflowDemoMenuMessage, /Agendar uma conversa/);
  assert.match(nutriflowDemoMenuMessage, /Suporte/);
  assert.match(nutriflowDemoMenuMessage, /Falar com atendimento/);
});

test("NutriFlow demo blocks clinical advice and real patient data", () => {
  assert.ok(nutriflowDemoProfile.blockedActions.includes("dar aconselhamento nutricional"));
  assert.ok(nutriflowDemoProfile.blockedActions.includes("usar dados reais de pacientes"));
  assert.ok(nutriflowDemoProfile.handoffRules.some((rule) => rule.intent === "nutrition_advice"));
});
