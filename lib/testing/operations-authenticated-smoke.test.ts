import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("operations authenticated smoke keeps auth artifacts local and ignored", () => {
  const gitignore = readFileSync(".gitignore", "utf8");
  const config = readFileSync("playwright.config.ts", "utf8");
  const authScript = readFileSync("scripts/e2e/operations-auth.mjs", "utf8");
  const clearScript = readFileSync("scripts/e2e/clear-operations-auth.mjs", "utf8");
  const writeScript = readFileSync("scripts/e2e/run-operations-write.mjs", "utf8");
  const packageJson = readFileSync("package.json", "utf8");

  assert.match(gitignore, /^\.auth\/$/m);
  assert.match(gitignore, /^\.auth\/browser-profile\/$/m);
  assert.match(gitignore, /^playwright-report\/$/m);
  assert.match(gitignore, /^test-results\/$/m);
  assert.match(gitignore, /^\*\.storage-state\.json$/m);
  assert.match(config, /storageState/);
  assert.match(config, /\.auth\/operations\.json/);
  assert.match(authScript, /launchPersistentContext/);
  assert.match(authScript, /\.auth\/browser-profile/);
  assert.match(authScript, /headless: false/);
  assert.match(authScript, /https:\/\/www\.shamarconnect\.com\.br/);
  assert.match(authScript, /30 \* 60 \* 1000/);
  assert.match(authScript, /pathname\.startsWith\("\/operations"\)/);
  assert.match(authScript, /process\.env\.CI/);
  assert.match(clearScript, /resolve\("\.auth\/operations\.json"\)/);
  assert.doesNotMatch(clearScript, /recursive:\s*true|rmSync|unlinkSync/);
  assert.match(packageJson, /"e2e:auth:clear"/);
  assert.match(packageJson, /"e2e:lips:readiness"/);
  assert.match(writeScript, /OPERATIONS_WRITE_SMOKE !== "true"/);
  assert.match(writeScript, /EXECUTAR HOMOLOGACAO CENTRO DE COMANDO/);
  assert.match(writeScript, /OPERATIONS_WRITE_CONFIRMED/);
  assert.match(readFileSync("tests/e2e/operations/write.spec.ts", "utf8"), /assertAllowedSmokeCompany/);
});

test("windows launchers are local read-only and do not call write smoke", () => {
  const loginLauncher = readFileSync("E2E-LOGIN-CENTRO-DE-COMANDO.cmd", "utf8");
  const readOnlyLauncher = readFileSync("E2E-VALIDAR-CENTRO-E-LIPS.cmd", "utf8");
  const clearLauncher = readFileSync("E2E-LIMPAR-SESSAO.cmd", "utf8");

  assert.match(loginLauncher, /npm run e2e:auth/);
  assert.match(loginLauncher, /allan@moriahsystems\.com\.br/);
  assert.match(loginLauncher, /Sess.o salva/);
  assert.match(readOnlyLauncher, /npm run e2e:operations:read/);
  assert.match(readOnlyLauncher, /npm run e2e:operations:visual/);
  assert.match(readOnlyLauncher, /npm run e2e:lips:readiness/);
  assert.doesNotMatch(readOnlyLauncher, /e2e:operations:write|OPERATIONS_WRITE_SMOKE/);
  assert.match(clearLauncher, /APAGAR SESSAO LOCAL E2E/);
  assert.match(clearLauncher, /\.auth\\operations\.json/);
  assert.match(clearLauncher, /\.auth\\browser-profile/);
  assert.doesNotMatch(clearLauncher, /(?:del|rmdir).*?(?:node_modules|test-results)/i);
  assert.doesNotMatch(clearLauncher, /rmdir \/s \/q "%CD%"/i);
});

test("operations authenticated smoke does not accept credentials or service role", () => {
  const sources = [
    "scripts/e2e/operations-auth.mjs",
    "scripts/e2e/run-operations-write.mjs",
    "tests/e2e/operations/helpers.ts",
    "tests/e2e/operations/read.spec.ts",
    "tests/e2e/operations/visual.spec.ts",
    "tests/e2e/operations/lips-readiness.spec.ts",
    "tests/e2e/operations/write.spec.ts",
  ].map((path) => readFileSync(path, "utf8")).join("\n");

  assert.doesNotMatch(sources, /password|senha|email\s*=/i);
  assert.doesNotMatch(sources, /document\.cookie|localStorage\.getItem|Authorization/i);
  assert.doesNotMatch(sources, /SUPABASE_SERVICE_ROLE_KEY|createSupabaseWriteClient/);
  assert.match(sources, /forbiddenClients = \["Lips", "Hall", "NutriFlow"\]/);
  assert.match(sources, /sanitizeLog/);
  assert.match(sources, /lips-readiness\.json/);
  assert.doesNotMatch(sources, /getByTestId\("lips-(?:bootstrap|incremental|reconciliation|diagnostic|process-next)-button"\)\.click/);
});
