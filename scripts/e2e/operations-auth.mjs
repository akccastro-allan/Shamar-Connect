import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.OPERATIONS_E2E_BASE_URL || "https://www.shamarconnect.com.br";
const storageStatePath = resolve(process.env.OPERATIONS_STORAGE_STATE || ".auth/operations.json");

if (process.env.CI) {
  throw new Error("e2e:auth is local-only and must not run in CI.");
}

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  console.log("Login aberto. Entre manualmente com operador global e navegue até /operations.");
  await page.waitForURL(/\/operations(?:$|[/?#])/, { timeout: 10 * 60 * 1000 });
  if (new URL(page.url()).pathname !== "/operations") {
    await page.goto(`${baseUrl}/operations`, { waitUntil: "networkidle" });
  }
  if (new URL(page.url()).pathname !== "/operations") {
    throw new Error("Sessão autenticada não chegou a /operations.");
  }
  await mkdir(dirname(storageStatePath), { recursive: true });
  await context.storageState({ path: storageStatePath });
  console.log(`Storage state local salvo em ${storageStatePath}`);
} finally {
  await browser.close();
}
