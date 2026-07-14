import assert from "node:assert/strict";
import test from "node:test";
import { canClaimConversation, canTransitionQueueStatus, normalizeDepartmentName, reopenAssignment, routeLipsConversation } from "./lips-routing.ts";

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

test("pagamento pix vai para financeiro e reserva para balcão", () => {
  assert.deepEqual(route("manda pix").queueKey, "financeiro");
  assert.deepEqual(route("manda pix").priority, "urgent");
  assert.equal(route("manda pix").slaMinutes, 5);
  assert.equal(route("separa essa").queueKey, "balcao");
  assert.equal(route("separa essa").priority, "urgent");
  assert.equal(route("separa essa").slaMinutes, 20);
});

test("oficina e reclamação roteiam corretamente", () => {
  const service = route("quero trocar óleo");
  assert.equal(service.queueKey, "oficina");
  assert.equal(service.slaMinutes, 10);
  const complaint = route("quero falar com o gerente");
  assert.equal(complaint.queueKey, "supervisao");
  assert.equal(complaint.priority, "urgent");
  assert.equal(complaint.slaMinutes, 5);
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
  assert.equal(canClaimConversation({ assignedUserId: null, status: "waiting" }), true);
  assert.equal(canClaimConversation({ assignedUserId: "user-1", status: "waiting" }), false);
  assert.equal(canClaimConversation({ assignedUserId: null, status: "in_progress" }), false);
});

test("matriz oficial permite e bloqueia transições da fila", () => {
  assert.equal(canTransitionQueueStatus({ from: "waiting", to: "in_progress", hasAssignee: true }), true);
  assert.equal(canTransitionQueueStatus({ from: "in_progress", to: "awaiting_customer", hasAssignee: true }), true);
  assert.equal(canTransitionQueueStatus({ from: "awaiting_customer", to: "in_progress", hasAssignee: true }), true);
  assert.equal(canTransitionQueueStatus({ from: "in_progress", to: "resolved", hasAssignee: true }), true);
  assert.equal(canTransitionQueueStatus({ from: "resolved", to: "waiting" }), true);
  assert.equal(canTransitionQueueStatus({ from: "resolved", to: "in_progress", hasAssignee: true, reassigningResolved: true }), true);
  assert.equal(canTransitionQueueStatus({ from: "resolved", to: "closed", actorRole: "supervisor" }), true);
  assert.equal(canTransitionQueueStatus({ from: "waiting", to: "closed", actorRole: "agent" }), false);
  assert.equal(canTransitionQueueStatus({ from: "closed", to: "in_progress", actorRole: "supervisor", hasAssignee: true }), false);
  assert.equal(canTransitionQueueStatus({ from: "resolved", to: "awaiting_customer" }), false);
  assert.equal(canTransitionQueueStatus({ from: "waiting", to: "awaiting_customer" }), false);
});

test("departamentos oficiais da Lips incluem financeiro", () => {
  assert.equal(normalizeDepartmentName("Balcão"), "balcao");
  assert.equal(normalizeDepartmentName("Oficina"), "oficina");
  assert.equal(normalizeDepartmentName("Financeiro"), "financeiro");
  assert.equal(normalizeDepartmentName("Supervisão"), "supervisao");
});

test("reabertura prefere último responsável dentro de 72 horas", () => {
  const now = new Date("2026-07-14T12:00:00.000Z");
  assert.equal(reopenAssignment({ lastAssignedUserId: "user-1", lastResolvedAt: "2026-07-12T12:00:00.000Z", now }), "user-1");
  assert.equal(reopenAssignment({ lastAssignedUserId: "user-1", lastResolvedAt: "2026-07-01T12:00:00.000Z", now }), null);
});
