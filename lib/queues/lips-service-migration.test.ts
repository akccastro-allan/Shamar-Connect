import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/0034_lips_service_queue.sql", "utf8");

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

test("migration restringe função server-only e indexa eventos por tipo", () => {
  assert.match(migration, /revoke all on function public\.mark_lips_sla_breaches\(boolean\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.mark_lips_sla_breaches\(boolean\) to service_role/);
  assert.match(migration, /whatsapp_conversation_events_conv_event_idx/);
  assert.match(migration, /\(conversation_id, event_type, created_at desc\)/);
  assert.match(migration, /sla_status is null or sla_status in \('on_time', 'warning', 'breached', 'completed'\)\) not valid/);
});
