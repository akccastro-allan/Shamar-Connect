import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/0034_lips_service_queue.sql", "utf8");
const migration0035 = readFileSync("supabase/migrations/0035_whatsapp_auto_sync.sql");

test("migration usa identificador livre e quatro departamentos oficiais", () => {
  assert.match(migration, /0034: Fila de atendimento produtiva Lips/);
  assert.match(migration, /\('Balcão', '#2ABFAB'\)/);
  assert.match(migration, /\('Oficina', '#1B2F5B'\)/);
  assert.match(migration, /\('Financeiro', '#0F766E'\)/);
  assert.match(migration, /\('Supervisão', '#C9952A'\)/);
});

test("migration cria memberships e disponibilidade offline do owner real", () => {
  assert.match(migration, /insert into public\.department_memberships/);
  assert.match(migration, /au\.email = 'lips@moriahsystems\.com\.br'/);
  assert.match(migration, /public\.normalize_department_name\(d\.name\) in \('balcao', 'oficina', 'financeiro', 'supervisao'\)/);
  assert.match(migration, /insert into public\.agent_availability/);
  assert.match(migration, /'offline', false, 0, 0, 3/);
});

test("migration não inventa horário comercial e prepara escalonamento idempotente", () => {
  assert.match(migration, /weekdays integer\[\] not null default '\{\}'/);
  assert.match(migration, /opens_at time,/);
  assert.match(migration, /create or replace function public\.mark_lips_sla_breaches/);
  assert.match(migration, /sla_breached_at is null/);
});

test("migration preserva prioridades antigas sem backfill de conversas", () => {
  assert.doesNotMatch(migration, /update public\.whatsapp_conversations\s+set priority/i);
  assert.match(migration, /priority in \('low', 'normal', 'high', 'urgent', 'baixa', 'alta', 'urgente'\)/);
});

test("migration preserva queue_status legado sem backfill", () => {
  assert.match(migration, /add column if not exists queue_status text,/);
  assert.doesNotMatch(migration, /queue_status text not null/i);
  assert.match(migration, /alter column queue_status set default 'waiting'/);
  assert.match(migration, /queue_status is null\s+or queue_status in \('waiting', 'in_progress', 'awaiting_customer', 'resolved', 'closed'\)/);
  assert.doesNotMatch(migration, /set\s+queue_status/i);
});

test("migration mantém sla_status compatível com legado", () => {
  assert.match(migration, /alter column sla_status set default 'on_time'/);
  assert.match(migration, /sla_status in \('on_time', 'warning', 'breached', 'completed', 'ok', 'pending'\)/);
  assert.doesNotMatch(migration, /sla_status is null or sla_status in \('on_time', 'warning', 'breached', 'completed'\)\) not valid/);
  assert.match(migration, /Valores legados ok\/pending permanecem temporariamente/);
});

test("migration resolve Lips por slug e nao por UUID fixo", () => {
  assert.doesNotMatch(migration, /8f074193-bf58-4537-9842-720619a9f259/);
  assert.match(migration, /o\.slug = 'auto-pecas-auto-center-lips'/);
  assert.match(migration, /where c\.session_id = 'lips-main'/);
});

test("migration completa eventos de conversa usados pela fila", () => {
  for (const column of ["channel_id", "actor_type", "actor_id", "actor_user_id", "previous_state", "new_state", "from_value", "to_value"]) {
    assert.match(migration, new RegExp(`add column if not exists ${column}`));
  }
  assert.match(migration, /whatsapp_conversation_events_actor_type_check/);
  assert.match(migration, /actor_type in \('system', 'user', 'automation', 'provider'\)/);
});

test("migration revoga browser antes dos grants server-only", () => {
  for (const table of ["department_memberships", "agent_availability", "agent_availability_events", "queue_business_hours", "whatsapp_conversation_events"]) {
    assert.match(migration, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`));
    assert.match(migration, new RegExp(`grant all on table public\\.${table} to service_role`));
  }
});

test("migration restringe função server-only e indexa eventos por tipo", () => {
  assert.match(migration, /revoke all on function public\.mark_lips_sla_breaches\(boolean\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.mark_lips_sla_breaches\(boolean\) to service_role/);
  assert.match(migration, /whatsapp_conversation_events_conv_event_idx/);
  assert.match(migration, /\(conversation_id, event_type, created_at desc\)/);
});

test("migration 0035 permanece inalterada", () => {
  const hash = createHash("sha256").update(migration0035).digest("hex");
  assert.equal(hash, "4b1e1ea7eeef14022905807550322cf9aac13e7eee615c6d75d245d7e14390e7");
});
