import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const migrationsDir = "supabase/migrations";
const migration0034aPath = `${migrationsDir}/20260716081549_0034a_lips_service_queue_columns.sql`;
const migration0034bPath = `${migrationsDir}/20260716081634_0034b_lips_service_queue_tables.sql`;
const migration0034cPath = `${migrationsDir}/20260716081700_0034c_lips_service_queue_function.sql`;
const migration0034dPath = `${migrationsDir}/20260716081742_0034d_lips_service_queue_seed.sql`;
const migration0035Path = `${migrationsDir}/20260716081940_0035_whatsapp_auto_sync.sql`;
const migration0036Path = `${migrationsDir}/20260716082000_0036_whatsapp_sync_scheduler.sql`;

const migration0034a = readFileSync(migration0034aPath, "utf8");
const migration0034b = readFileSync(migration0034bPath, "utf8");
const migration0034c = readFileSync(migration0034cPath, "utf8");
const migration0034d = readFileSync(migration0034dPath, "utf8");
const migration0034 = [migration0034a, migration0034b, migration0034c, migration0034d].join("\n");
const migration0035 = readFileSync(migration0035Path);
const migration0036 = readFileSync(migration0036Path, "utf8");

test("historico local reflete migrations aplicadas no Supabase", () => {
  assert.equal(existsSync(`${migrationsDir}/0034_lips_service_queue.sql`), false);
  assert.equal(existsSync(`${migrationsDir}/0035_whatsapp_auto_sync.sql`), false);
  assert.equal(existsSync(`${migrationsDir}/0036_whatsapp_sync_scheduler.sql`), false);

  for (const path of [migration0034aPath, migration0034bPath, migration0034cPath, migration0034dPath, migration0035Path, migration0036Path]) {
    assert.equal(existsSync(path), true, `${path} deve existir`);
  }

  const migrationFiles = readdirSync(migrationsDir);
  assert.equal(migrationFiles.filter((file) => file.includes("0034") && file.endsWith(".sql")).length, 4);
  assert.equal(migrationFiles.filter((file) => file.includes("0035_whatsapp_auto_sync") && file.endsWith(".sql")).length, 1);
});

test("0034a contem somente colunas, defaults e constraints da fila", () => {
  assert.match(migration0034a, /0034a: Colunas e constraints/);
  assert.match(migration0034a, /create or replace function public\.normalize_department_name/);
  assert.match(migration0034a, /add column if not exists queue_status text,/);
  assert.doesNotMatch(migration0034a, /queue_status text not null/i);
  assert.match(migration0034a, /alter column queue_status set default 'waiting'/);
  assert.match(migration0034a, /queue_status is null\s+or queue_status in \('waiting', 'in_progress', 'awaiting_customer', 'resolved', 'closed'\)/);
  assert.match(migration0034a, /alter column sla_status set default 'on_time'/);
  assert.match(migration0034a, /sla_status in \('on_time', 'warning', 'breached', 'completed', 'ok', 'pending'\)/);
  assert.match(migration0034a, /priority in \('low', 'normal', 'high', 'urgent', 'baixa', 'alta', 'urgente'\)/);
});

test("0034a nao faz backfill de queue_status nem prioridade", () => {
  assert.doesNotMatch(migration0034a, /set\s+queue_status/i);
  assert.doesNotMatch(migration0034a, /update public\.whatsapp_conversations/i);
  assert.doesNotMatch(migration0034a, /update public\.whatsapp_conversations\s+set priority/i);
});

test("0034b cria tabelas, eventos, RLS, revokes, grants e indices", () => {
  for (const table of ["department_memberships", "agent_availability", "agent_availability_events", "queue_business_hours", "whatsapp_conversation_events"]) {
    assert.match(migration0034b, new RegExp(`public\\.${table}`));
    assert.match(migration0034b, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration0034b, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`));
    assert.match(migration0034b, new RegExp(`grant all on table public\\.${table} to service_role`));
  }

  for (const column of ["channel_id", "actor_type", "actor_id", "actor_user_id", "previous_state", "new_state", "from_value", "to_value"]) {
    assert.match(migration0034b, new RegExp(`add column if not exists ${column}`));
  }

  assert.match(migration0034b, /whatsapp_conversation_events_actor_type_check/);
  assert.match(migration0034b, /actor_type in \('system', 'user', 'automation', 'provider'\)/);
  assert.match(migration0034b, /whatsapp_conversation_events_conv_event_idx/);
});

test("0034c resolve Lips por slug e session_id e restringe funcao", () => {
  assert.match(migration0034c, /create or replace function public\.mark_lips_sla_breaches/);
  assert.match(migration0034c, /o\.slug = 'auto-pecas-auto-center-lips'/);
  assert.match(migration0034c, /where c\.session_id = 'lips-main'/);
  assert.match(migration0034c, /sla_breached_at is null/);
  assert.match(migration0034c, /revoke all on function public\.mark_lips_sla_breaches\(boolean\) from public, anon, authenticated/);
  assert.match(migration0034c, /grant execute on function public\.mark_lips_sla_breaches\(boolean\) to service_role/);
});

test("0034d faz seed idempotente da Lips sem UUID fixo", () => {
  assert.match(migration0034d, /\('Balcão', '#2ABFAB'\)/);
  assert.match(migration0034d, /\('Oficina', '#1B2F5B'\)/);
  assert.match(migration0034d, /\('Financeiro', '#0F766E'\)/);
  assert.match(migration0034d, /\('Supervisão', '#C9952A'\)/);
  assert.match(migration0034d, /insert into public\.queue_business_hours/);
  assert.match(migration0034d, /insert into public\.department_memberships/);
  assert.match(migration0034d, /au\.email = 'lips@moriahsystems\.com\.br'/);
  assert.match(migration0034d, /public\.normalize_department_name\(d\.name\) in \('balcao', 'oficina', 'financeiro', 'supervisao'\)/);
  assert.match(migration0034d, /insert into public\.agent_availability/);
  assert.match(migration0034d, /'offline', false, 0, 0, 3/);
  assert.match(migration0034d, /on conflict/);
});

test("migrations Lips nao usam UUID fixo", () => {
  assert.doesNotMatch(migration0034, /8f074193-bf58-4537-9842-720619a9f259/);
});

test("0035 usa timestamp aplicado e permanece inalterada", () => {
  const hash = createHash("sha256").update(migration0035).digest("hex");
  assert.equal(hash, "4b1e1ea7eeef14022905807550322cf9aac13e7eee615c6d75d245d7e14390e7");
});

test("0036 permanece pendente e posterior ao historico aplicado", () => {
  assert.match(migration0036Path, /20260716082000_0036_whatsapp_sync_scheduler\.sql$/);
  assert.match(migration0036, /A migration do scheduler só pode ser aplicada depois do endpoint existir em Production e do INTERNAL_API_KEY estar configurado no ambiente Production\./);
  assert.match(migration0036, /cron\.schedule/);
});
