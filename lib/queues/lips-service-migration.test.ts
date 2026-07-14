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
