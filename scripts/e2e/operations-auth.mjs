import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = "https://www.shamarconnect.com.br";
const storageStatePath = resolve(process.env.OPERATIONS_STORAGE_STATE || ".auth/operations.json");
const browserProfilePath = resolve(".auth/browser-profile");
const loginTimeoutMs = 30 * 60 * 1000;

if (process.env.CI) {
  throw new Error("e2e:auth is local-only and must not run in CI.");
}

function sanitizeError(value) {
  return String(value || "Falha no login E2E.")
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [token]")
    .replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]")
    .slice(0, 240);
}

await mkdir(dirname(storageStatePath), { recursive: true });

const context = await chromium.launchPersistentContext(browserProfilePath, {
  headless: false,
  viewport: { width: 1440, height: 900 },
});
const page = context.pages()[0] || await context.newPage();

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  console.log("Login aberto no dominio oficial. Entre manualmente e aguarde /operations.");
  await page.waitForURL(
    (url) => url.origin === baseUrl && url.pathname.startsWith("/operations"),
    { timeout: loginTimeoutMs },
  );
  const currentUrl = new URL(page.url());
  if (currentUrl.origin !== baseUrl || !currentUrl.pathname.startsWith("/operations")) {
    await page.goto(`${baseUrl}/operations`, { waitUntil: "networkidle" });
  }
  const finalUrl = new URL(page.url());
  if (finalUrl.origin !== baseUrl || !finalUrl.pathname.startsWith("/operations") || finalUrl.pathname === "/login") {
    throw new Error(`Sessao autenticada nao chegou a /operations. URL final: ${finalUrl.origin}${finalUrl.pathname}`);
  }
  await context.storageState({ path: storageStatePath });
  console.log("Sessão salva com segurança.");
  await context.close();
} catch (error) {
  console.error(`Login E2E nao concluido: ${sanitizeError(error instanceof Error ? error.message : error)}`);
  console.error("Nenhum cookie, token ou storageState foi impresso.");
  process.exitCode = 1;
}
