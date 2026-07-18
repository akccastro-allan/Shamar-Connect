import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const migrationsDir = "supabase/migrations";
const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();
const allMigrations = migrationFiles
  .map((file) => readFileSync(`${migrationsDir}/${file}`, "utf8"))
  .join("\n");
const migration0035Path = `${migrationsDir}/20260716081940_0035_whatsapp_auto_sync.sql`;
const migration0035 = readFileSync(migration0035Path, "utf8");
const migration0035Normalized = migration0035.replace(/\r\n/g, "\n");

const sensitiveTables = [
  "billing_subscriptions",
  "billing_checkout_sessions",
  "ai_response_logs",
  "whatsapp_shared_contacts",
  "whatsapp_media_files",
  "whatsapp_shared_locations",
  "finance_payments",
];

const internalServerOnlyTables = [
  "commercial_agent_profiles",
  "commercial_conversation_analysis",
  "commercial_follow_ups",
  "commercial_opportunities",
  "commercial_response_suggestions",
  "internal_messaging_gateways",
];

test("scheduler automatico fica fora de supabase/migrations", () => {
  assert.equal(
    existsSync(
      `${migrationsDir}/20260716082000_0036_whatsapp_sync_scheduler.sql`,
    ),
    false,
  );
  assert.equal(
    existsSync("docs/operations/sql/whatsapp_sync_scheduler_pending.sql"),
    true,
  );
});

test("migrations nao criam cron nem dependem de Vault", () => {
  assert.doesNotMatch(allMigrations, /cron\.schedule/i);
  assert.doesNotMatch(
    allMigrations,
    /create\s+extension\s+if\s+not\s+exists\s+pg_cron/i,
  );
  assert.doesNotMatch(allMigrations, /vault\.decrypted_secrets/i);
  assert.doesNotMatch(
    allMigrations,
    /create\s+extension\s+if\s+not\s+exists\s+vault/i,
  );
});

test("migrations nao carregam secrets, tokens ou UUIDs reais", () => {
  assert.doesNotMatch(
    allMigrations,
    /SUPABASE_SERVICE_ROLE_KEY|WHATSAPP_GATEWAY_TOKEN|SESSION_SECRET|INTERNAL_API_KEY/i,
  );
  assert.doesNotMatch(
    allMigrations,
    /password\s*[:=]|secret\s*[:=]|token\s*[:=]/i,
  );
  assert.doesNotMatch(
    allMigrations,
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  );
});

test("migrations nao inserem dados reais sensiveis", () => {
  assert.doesNotMatch(
    allMigrations,
    /@gmail\.com|@hotmail\.com|@outlook\.com/i,
  );
  assert.doesNotMatch(allMigrations, /\b\+?55\d{10,11}\b/);
});

test("tabelas sensiveis recebem RLS, revokes, grants e policy service_role", () => {
  for (const table of sensitiveTables) {
    assert.match(
      allMigrations,
      new RegExp(
        `alter table public\\.${table} enable row level security`,
        "i",
      ),
      `${table} sem RLS`,
    );
    assert.match(
      allMigrations,
      new RegExp(
        `revoke all on table public\\.${table} from public, anon, authenticated`,
        "i",
      ),
      `${table} sem revoke`,
    );
    assert.match(
      allMigrations,
      new RegExp(`grant all on table public\\.${table} to service_role`, "i"),
      `${table} sem grant service_role`,
    );
    assert.match(
      allMigrations,
      new RegExp(
        `create policy .*${table}.*auth\\.role\\(\\) = 'service_role'`,
        "is",
      ),
      `${table} sem policy service_role`,
    );
  }
});

test("tabelas internas permanecem server-only na baseline fresh environment", () => {
  for (const table of internalServerOnlyTables) {
    const tableRef = `(?:public\\.${table}|"public"\\."${table}")`;
    const finalRevoke = `revoke all privileges\non table public.${table}\nfrom public, anon, authenticated;`;
    const finalRevokeIndex = migration0035Normalized
      .toLowerCase()
      .lastIndexOf(finalRevoke);

    assert.match(
      migration0035,
      new RegExp(`alter table ${tableRef} enable row level security`, "i"),
      `${table} sem RLS`,
    );
    assert.notEqual(
      finalRevokeIndex,
      -1,
      `${table} sem revoke final de public/anon/authenticated`,
    );
    assert.match(
      migration0035,
      new RegExp(
        `grant all privileges\\s+on table public\\.${table}\\s+to service_role;`,
        "i",
      ),
      `${table} sem grant final service_role`,
    );
    assert.match(
      migration0035,
      new RegExp(
        `create policy [\\s\\S]*on "public"\\."${table}"[\\s\\S]*auth\\.role\\(\\) = 'service_role'`,
        "i",
      ),
      `${table} sem policy server-only`,
    );

    const afterFinalRevoke = migration0035Normalized.slice(
      finalRevokeIndex + finalRevoke.length,
    );
    assert.doesNotMatch(
      afterFinalRevoke,
      new RegExp(
        `grant\\s+(select|insert|update|delete|all|all privileges|references|trigger|truncate)[\\s\\S]*on table\\s+${tableRef}[\\s\\S]*to\\s+"?(public|anon|authenticated)"?`,
        "i",
      ),
      `${table} teve acesso reaberto depois do revoke final`,
    );
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
    assert.match(
      migration0035,
      new RegExp(`create table "public"\\."${table}"`, "i"),
      `${table} ausente do baseline`,
    );
  }

  const baselineWithoutAllowedSeedCleanup = migration0035.replace(
    /delete from public\.whatsapp_connections\s+where tenant_id is null or organization_id is null;\s*/i,
    "",
  );

  assert.match(
    migration0035,
    /Production already records migration 20260716081940 as applied/i,
  );
  assert.doesNotMatch(
    baselineWithoutAllowedSeedCleanup,
    /^\s*drop\s+(table|function)\b|^\s*truncate\b|^\s*delete\s+from\b/im,
  );
  assert.doesNotMatch(
    migration0035,
    /vault\.decrypted_secrets|cron\.schedule|pg_cron/i,
  );
});

test("workflow manual gera artifact de reconciliacao sem push, repair ou commit automatico", () => {
  const workflow = readFileSync(
    ".github/workflows/generate-supabase-schema-reconciliation.yml",
    "utf8",
  );
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /docker info/);
  assert.match(workflow, /POSTGRES_URL/);
  assert.match(workflow, /supabase(@latest)? db diff/);
  assert.match(workflow, /--db-url "\$POSTGRES_URL"/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.doesNotMatch(
    workflow,
    /db push|migration repair|git commit|git push/i,
  );
});
