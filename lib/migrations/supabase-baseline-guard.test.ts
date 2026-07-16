import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const migrationsDir = "supabase/migrations";
const migrationFiles = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();
const allMigrations = migrationFiles.map((file) => readFileSync(`${migrationsDir}/${file}`, "utf8")).join("\n");
const migration0035Path = `${migrationsDir}/20260716081940_0035_whatsapp_auto_sync.sql`;
const migration0035 = readFileSync(migration0035Path, "utf8");

const sensitiveTables = [
  "billing_subscriptions",
  "billing_checkout_sessions",
  "ai_response_logs",
  "whatsapp_shared_contacts",
  "whatsapp_media_files",
  "whatsapp_shared_locations",
  "finance_payments",
];

test("scheduler automatico fica fora de supabase/migrations", () => {
  assert.equal(existsSync(`${migrationsDir}/20260716082000_0036_whatsapp_sync_scheduler.sql`), false);
  assert.equal(existsSync("docs/operations/sql/whatsapp_sync_scheduler_pending.sql"), true);
});

test("migrations nao criam cron nem dependem de Vault", () => {
  assert.doesNotMatch(allMigrations, /cron\.schedule/i);
  assert.doesNotMatch(allMigrations, /create\s+extension\s+if\s+not\s+exists\s+pg_cron/i);
  assert.doesNotMatch(allMigrations, /vault\.decrypted_secrets/i);
  assert.doesNotMatch(allMigrations, /create\s+extension\s+if\s+not\s+exists\s+vault/i);
});

test("migrations nao carregam secrets, tokens ou UUIDs reais", () => {
  assert.doesNotMatch(allMigrations, /SUPABASE_SERVICE_ROLE_KEY|WHATSAPP_GATEWAY_TOKEN|SESSION_SECRET|INTERNAL_API_KEY/i);
  assert.doesNotMatch(allMigrations, /password\s*[:=]|secret\s*[:=]|token\s*[:=]/i);
  assert.doesNotMatch(allMigrations, /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i);
});

test("migrations nao inserem dados reais sensiveis", () => {
  assert.doesNotMatch(allMigrations, /insert\s+into\s+public\.(crm_contacts|billing_checkout_sessions|finance_payments|catalog_items)/i);
  assert.doesNotMatch(allMigrations, /@gmail\.com|@hotmail\.com|@outlook\.com/i);
});

test("tabelas sensiveis recebem RLS, revokes, grants e policy service_role", () => {
  for (const table of sensitiveTables) {
    assert.match(allMigrations, new RegExp(`alter table public\\.${table} enable row level security`, "i"), `${table} sem RLS`);
    assert.match(allMigrations, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`, "i"), `${table} sem revoke`);
    assert.match(allMigrations, new RegExp(`grant all on table public\\.${table} to service_role`, "i"), `${table} sem grant service_role`);
    assert.match(allMigrations, new RegExp(`create policy .*${table}.*auth\\.role\\(\\) = 'service_role'`, "is"), `${table} sem policy service_role`);
  }
});

test("baseline de reconciliacao nao pode ser incorporada parcialmente", () => {
  const marker = "FRESH ENVIRONMENT SCHEMA RECONCILIATION";
  if (!migration0035.includes(marker)) {
    return;
  }

  for (const table of [
    "internal_messaging_gateways",
    "commercial_agent_profiles",
    "message_outbox",
    "agent_automation_jobs",
    "crm_deals",
    "crm_tasks",
  ]) {
    assert.match(migration0035, new RegExp(`create table if not exists public\\.${table}`, "i"), `${table} ausente do baseline`);
  }

  assert.doesNotMatch(migration0035, /drop\s+(table|column|function|policy|extension)|truncate\s+|delete\s+from|update\s+public\./i);
});

test("workflow manual gera artifact de reconciliacao sem push, repair ou commit automatico", () => {
  const workflow = readFileSync(".github/workflows/generate-supabase-schema-reconciliation.yml", "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /docker info/);
  assert.match(workflow, /supabase link/);
  assert.match(workflow, /--project-ref bbcxqvgdsdntwojjpwoz/);
  assert.match(workflow, /supabase db diff/);
  assert.match(workflow, /--linked/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.doesNotMatch(workflow, /db push|migration repair|git commit|git push/i);
});
