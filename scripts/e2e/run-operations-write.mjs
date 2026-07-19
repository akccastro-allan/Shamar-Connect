import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const confirmation = "EXECUTAR HOMOLOGACAO CENTRO DE COMANDO";
const storageStatePath = process.env.OPERATIONS_STORAGE_STATE || ".auth/operations.json";

if (process.env.CI) {
  throw new Error("e2e:operations:write is local-only and must not run in CI.");
}

if (process.env.OPERATIONS_WRITE_SMOKE !== "true") {
  throw new Error("Set OPERATIONS_WRITE_SMOKE=true to run the controlled write smoke.");
}

if (!existsSync(storageStatePath)) {
  throw new Error(`Missing storage state at ${storageStatePath}. Run npm run e2e:auth first.`);
}

const rl = createInterface({ input, output });
const answer = await rl.question(`Digite exatamente: ${confirmation}\n> `);
rl.close();

if (answer !== confirmation) {
  throw new Error("Confirmação incorreta. Smoke de escrita abortado.");
}

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(command, ["playwright", "test", "tests/e2e/operations/write.spec.ts", "--project=chromium"], {
  stdio: "inherit",
  env: { ...process.env, OPERATIONS_WRITE_CONFIRMED: "true" },
});

child.on("exit", (code) => process.exit(code ?? 1));
