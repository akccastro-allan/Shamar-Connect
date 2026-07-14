import assert from "node:assert/strict";
import test from "node:test";
import { canClaimConversation, reopenAssignment, routeLipsConversation } from "./lips-routing.ts";

function route(messageBody: string, requiresHuman = true) {
  return routeLipsConversation({ conversationId: "conv-1", messageBody, requiresHuman });
}

test("cotação inicial segura não exige fila humana imediata", () => {
  const decision = route("tem pastilha?", false);
  assert.equal(decision.queueKey, "balcao");
  assert.equal(decision.priority, "normal");
  assert.equal(decision.reason, "safe_quote_automation_allowed");
});

test("interesse em compra vai para balcão com prioridade alta", () => {
  const decision = route("quero sim");
  assert.equal(decision.queueKey, "balcao");
  assert.equal(decision.priority, "high");
  assert.equal(decision.slaMinutes, 20);
});

test("pagamento pix e reserva vão para supervisão urgente", () => {
  assert.deepEqual(route("manda pix").queueKey, "supervisao");
  assert.deepEqual(route("manda pix").priority, "urgent");
  assert.equal(route("separa essa").queueKey, "supervisao");
  assert.equal(route("separa essa").slaMinutes, 0);
});

test("oficina e reclamação roteiam corretamente", () => {
  const service = route("quero trocar óleo");
  assert.equal(service.queueKey, "oficina");
  assert.equal(service.slaMinutes, 10);
  const complaint = route("quero falar com o gerente");
  assert.equal(complaint.queueKey, "supervisao");
  assert.equal(complaint.priority, "urgent");
});

test("preserva responsável em conversa ativa", () => {
  const decision = routeLipsConversation({
    conversationId: "conv-1",
    messageBody: "manda pix",
    requiresHuman: true,
    currentAssignedUserId: "user-1",
    currentStatus: "in_progress",
  });
  assert.equal(decision.preserveCurrentAssignment, true);
});

test("claim concorrente só permite conversa sem responsável e em estado assumível", () => {
  assert.equal(canClaimConversation({ assignedUserId: null, status: "queued" }), true);
  assert.equal(canClaimConversation({ assignedUserId: "user-1", status: "queued" }), false);
  assert.equal(canClaimConversation({ assignedUserId: null, status: "in_progress" }), false);
});

test("reabertura prefere último responsável dentro de 72 horas", () => {
  const now = new Date("2026-07-14T12:00:00.000Z");
  assert.equal(reopenAssignment({ lastAssignedUserId: "user-1", lastResolvedAt: "2026-07-12T12:00:00.000Z", now }), "user-1");
  assert.equal(reopenAssignment({ lastAssignedUserId: "user-1", lastResolvedAt: "2026-07-01T12:00:00.000Z", now }), null);
});
