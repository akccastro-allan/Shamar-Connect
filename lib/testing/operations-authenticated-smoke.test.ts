import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("operations authenticated smoke keeps auth artifacts local and ignored", () => {
  const gitignore = readFileSync(".gitignore", "utf8");
  const config = readFileSync("playwright.config.ts", "utf8");
  const authScript = readFileSync("scripts/e2e/operations-auth.mjs", "utf8");
  const writeScript = readFileSync("scripts/e2e/run-operations-write.mjs", "utf8");

  assert.match(gitignore, /^\.auth\/$/m);
  assert.match(gitignore, /^playwright-report\/$/m);
  assert.match(gitignore, /^test-results\/$/m);
  assert.match(gitignore, /^\*\.storage-state\.json$/m);
  assert.match(config, /storageState/);
  assert.match(config, /\.auth\/operations\.json/);
  assert.match(authScript, /headless: false/);
  assert.match(authScript, /waitForURL\(\/\\\/operations/);
  assert.match(authScript, /process\.env\.CI/);
  assert.match(writeScript, /OPERATIONS_WRITE_SMOKE !== "true"/);
  assert.match(writeScript, /EXECUTAR HOMOLOGACAO CENTRO DE COMANDO/);
  assert.match(writeScript, /OPERATIONS_WRITE_CONFIRMED/);
  assert.match(readFileSync("tests/e2e/operations/write.spec.ts", "utf8"), /assertAllowedSmokeCompany/);
});

test("operations authenticated smoke does not accept credentials or service role", () => {
  const sources = [
    "scripts/e2e/operations-auth.mjs",
    "scripts/e2e/run-operations-write.mjs",
    "tests/e2e/operations/helpers.ts",
    "tests/e2e/operations/read.spec.ts",
    "tests/e2e/operations/visual.spec.ts",
    "tests/e2e/operations/write.spec.ts",
  ].map((path) => readFileSync(path, "utf8")).join("\n");

  assert.doesNotMatch(sources, /password|senha|email\s*=/i);
  assert.doesNotMatch(sources, /document\.cookie|localStorage\.getItem|Authorization/i);
  assert.doesNotMatch(sources, /SUPABASE_SERVICE_ROLE_KEY|createSupabaseWriteClient/);
  assert.match(sources, /forbiddenClients = \["Lips", "Hall", "NutriFlow"\]/);
  assert.match(sources, /sanitizeLog/);
});
