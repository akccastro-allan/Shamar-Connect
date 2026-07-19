import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { commandCenterEntities } from "../admin/command-center-config.ts";
import { getOperationsCompanySlugs, internalWhatsappSessions, isAllowedOperationsCompanySlug } from "./command-center-scope.ts";
import { resolveOperationsFilters } from "./page-filters.ts";

test("operations selector only allows internal company slugs", () => {
  assert.equal(isAllowedOperationsCompanySlug("moriah-systems"), true);
  assert.equal(isAllowedOperationsCompanySlug("allan-pessoal"), true);
  assert.equal(isAllowedOperationsCompanySlug("viciados-em-trilhas"), true);
  assert.equal(isAllowedOperationsCompanySlug("lips"), false);
  assert.equal(isAllowedOperationsCompanySlug("hall"), false);
  assert.equal(isAllowedOperationsCompanySlug("nutriflow"), false);
});

test("operations company catalog excludes SaaS clients", () => {
  const names = commandCenterEntities.map((entity) => entity.name.toLowerCase());
  const slugs = getOperationsCompanySlugs();

  assert.equal(names.includes("lips"), false);
  assert.equal(names.includes("hall"), false);
  assert.equal(names.includes("nutriflow"), false);
  assert.equal(slugs.includes("lips"), false);
  assert.equal(slugs.includes("hall"), false);
  assert.equal(slugs.includes("nutriflow"), false);
});

test("operations internal whatsapp sessions exclude Lips and Hall", () => {
  assert.equal(internalWhatsappSessions.includes("shamar-main"), true);
  assert.equal(internalWhatsappSessions.includes("lips-main" as never), false);
  assert.equal(internalWhatsappSessions.includes("hall-main" as never), false);
});

test("operations UI does not reference secret social token fields", () => {
  const source = readFileSync("components/operations/operations-command-center.tsx", "utf8");
  assert.equal(source.includes("access_token"), false);
  assert.equal(source.includes("verify_token"), false);
  assert.equal(source.includes("agent_token_hash"), false);
  assert.equal(source.includes("install_key_hash"), false);
});

test("operations routes use shared frame states and preserve query filters", async () => {
  const source = readFileSync("components/operations/operations-command-center.tsx", "utf8");
  const ui = readFileSync("components/operations/ui.tsx", "utf8");
  const loading = readFileSync("app/operations/loading.tsx", "utf8");
  const error = readFileSync("app/operations/error.tsx", "utf8");

  assert.match(source, /function companyQuery/);
  assert.match(source, /params\.set\("company"/);
  assert.match(source, /params\.set\("period"/);
  assert.match(source, /params\.set\("q"/);
  assert.match(source, /name="q"/);
  assert.match(source, /Buscar empresa, canal, tarefa ou integração/);
  assert.match(ui, /OperationalStatus/);
  assert.match(ui, /LoadingState/);
  assert.match(ui, /EmptyState/);
  assert.match(ui, /ErrorState/);
  assert.match(ui, /ResponsiveDataList/);
  assert.match(loading, /LoadingState/);
  assert.match(error, /ErrorState/);

  const filters = await resolveOperationsFilters({
    company: "moriah-systems",
    period: "7d",
    q: "gateway",
  });
  assert.deepEqual(filters, {
    company: "moriah-systems",
    period: "7d",
    q: "gateway",
  });
});

test("operations command center has no fake controls or SaaS client leakage", () => {
  const source = readFileSync("components/operations/operations-command-center.tsx", "utf8");
  const loader = readFileSync("lib/operations/command-center.ts", "utf8");
  const diagnostics = readFileSync(
    "app/operations/diagnostics/whatsapp-sync/whatsapp-sync-diagnostics-client.tsx",
    "utf8",
  );

  assert.doesNotMatch(source, /Busca operacional preparada/);
  assert.doesNotMatch(source, /Filtro:/);
  assert.match(source, /Lips, Hall, NutriFlow e demais clientes SaaS ficam fora/);
  assert.match(loader, /lips-main/);
  assert.match(loader, /hall-main/);
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /focus-visible:ring/);
  assert.match(diagnostics, /Consultas seguras/);
  assert.match(diagnostics, /Execuções controladas/);
  assert.match(diagnostics, /Execuções de escrita desabilitadas/);
  assert.ok(
    diagnostics.indexOf("Consultas seguras") <
      diagnostics.indexOf("Execuções controladas"),
  );
});

test("operations core actions validate command center internal company and audit writes", () => {
  const actions = readFileSync("lib/operations/actions.ts", "utf8");
  const panels = readFileSync("components/operations/operations-action-panels.tsx", "utf8");
  const source = readFileSync("components/operations/operations-command-center.tsx", "utf8");
  const appContext = readFileSync("lib/auth/app-context.ts", "utf8");

  assert.match(actions, /getRequiredAppContext/);
  assert.match(actions, /canAccessCommandCenter/);
  assert.match(appContext, /select\("is_platform, status"\)/);
  assert.match(appContext, /eq\("status", "active"\)/);
  assert.match(actions, /isAllowedOperationsCompanySlug/);
  assert.match(actions, /loadInternalOrganizationIds/);
  assert.match(actions, /eq\("tenant_id", actor\.tenantId\)/);
  assert.match(actions, /audit_trail/);
  assert.match(actions, /operations\.task\.create/);
  assert.match(actions, /operations\.event\.create/);
  assert.match(actions, /operations\.content\.create/);
  assert.match(actions, /operations\.alert\.update/);
  assert.match(actions, /metadata\.operations/);
  assert.match(actions, /const \{ error \} = await db\.from\("audit_trail"\)\.insert/);
  assert.match(actions, /if \(error\) throw error/);
  assert.doesNotMatch(actions, /sendMessage|publish\(/);
  assert.doesNotMatch(actions, /lips-main|hall-main/);
  assert.doesNotMatch(actions, /@(?:gmail|hotmail|moriah|shamar|lips|hall)\./i);
  assert.doesNotMatch(actions, /formData\.get\("(?:tenant_id|tenantId|organization_id|organizationId|actor|user_id|userId|is_platform|role|metadata|password|cookie|session)"\)/);
  assert.match(panels, /useActionState/);
  assert.match(panels, /status\.pending/);
  assert.match(panels, /disabled=\{status\.pending\}/);
  assert.match(source, /TaskOperationsForm/);
  assert.match(source, /EventOperationsForm/);
  assert.match(source, /ContentOperationsForm/);
  assert.match(source, /CompanyOperationsForm/);
  assert.match(source, /AlertOperationsForm/);
});

test("operations core actions block invalid clients transitions dates and protected fields", () => {
  const actions = readFileSync("lib/operations/actions.ts", "utf8");
  const panels = readFileSync("components/operations/operations-action-panels.tsx", "utf8");

  assert.equal(isAllowedOperationsCompanySlug("lips"), false);
  assert.equal(isAllowedOperationsCompanySlug("hall"), false);
  assert.equal(isAllowedOperationsCompanySlug("nutriflow"), false);
  assert.equal(isAllowedOperationsCompanySlug("unknown-company"), false);
  assert.match(actions, /\.eq\("tenant_id", tenantId\)\s*\.eq\("slug", slug\)/);
  assert.match(actions, /\.eq\("tenant_id", actor\.tenantId\)\.eq\("organization_id", organization\.id\)/);
  assert.match(actions, /requireChoice\(firstText\(formData, "status", 40\) \|\| "pending", \["pending", "in_progress", "blocked", "completed", "cancelled"\]/);
  assert.match(actions, /requireChoice\(firstText\(formData, "transition", 40\) \|\| "draft", \["draft", "review", "approved", "scheduled", "cancelled"\]/);
  assert.match(actions, /requireChoice\(firstText\(formData, "status", 40\), \["open", "active", "acknowledged", "in_progress", "resolved"\]/);
  assert.match(actions, /Data final anterior ao início/);
  assert.match(actions, /Data de programação/);
  assert.match(actions, /optionalDate\(formData, "dueAt", "Prazo"\)/);
  assert.doesNotMatch(actions, /safeChoice/);
  assert.doesNotMatch(panels, /value="(?:approve|reject|schedule|cancel_schedule)"/);
});

test("operations sanitizer removes urls bearer tokens and long tokens", () => {
  const actions = readFileSync("lib/operations/actions.ts", "utf8");
  assert.match(actions, /replace\(\/https\?:\\\/\\\/\\S\+\/g, "\[url\]"\)/);
  assert.match(actions, /replace\(\/Bearer\\s\+\[\^\\s\]\+\/gi, "Bearer \[token\]"\)/);
  assert.match(actions, /replace\(\/\[A-Za-z0-9_-\]\{32,\}\/g, "\[redacted\]"\)/);
  assert.doesNotMatch(actions, /old_values|new_values|messageText.*metadata|formData.*metadata/i);
  assert.doesNotMatch(actions, /access_token|refresh_token|cookie|senha|password/i);
});

test("operations snapshot includes alerts audit and restricted search without messages", () => {
  const loader = readFileSync("lib/operations/command-center.ts", "utf8");
  assert.match(loader, /system_alerts/);
  assert.match(loader, /audit_trail/);
  assert.match(loader, /contains\("metadata", \{ source: "operations_command_center" \}\)/);
  assert.match(loader, /orgIdSet\.has/);
  assert.match(loader, /matchesSearch\(\[alert\.title/);
  assert.match(loader, /whatsapp_conversations"\).*select\("id, organization_id, name, status/);
  assert.doesNotMatch(loader, /body|message_text\], search/);
});
