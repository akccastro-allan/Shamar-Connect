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
