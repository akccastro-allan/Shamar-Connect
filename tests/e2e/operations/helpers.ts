import { expect, type Page, type TestInfo } from "@playwright/test";

export const operationsBasePath = "/operations";
export const storageStatePath = process.env.OPERATIONS_STORAGE_STATE || ".auth/operations.json";
export const lowRiskCompanyLabel = process.env.OPERATIONS_SMOKE_COMPANY || "Moriah Systems";
export const smokePrefix = "[HOMOLOGAÇÃO CENTRO DE COMANDO]";
export const forbiddenClients = ["Lips", "Hall", "NutriFlow"];
export const secretPatterns = [
  /Bearer\s+[A-Za-z0-9._-]+/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /service[_-]?role/i,
  /whatsapp[_-]?gateway[_-]?token/i,
  /cookie\s*[:=]/i,
  /session\s*[:=]/i,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
];

export function assertLocalAuthenticatedSmoke() {
  if (process.env.CI) throw new Error("Authenticated operations smoke is local-only and must not run in CI.");
}

export function assertAllowedSmokeCompany(label = lowRiskCompanyLabel) {
  if (forbiddenClients.some((client) => label.toLowerCase().includes(client.toLowerCase()))) {
    throw new Error(`Empresa bloqueada para smoke operacional: ${sanitizeLog(label)}`);
  }
}

export function sanitizeLog(value: unknown) {
  return String(value || "")
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [token]")
    .replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]")
    .replace(/\b\d{10,13}\b/g, "[phone]")
    .slice(0, 300);
}

export async function gotoAuthenticated(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "networkidle" });
  expect(response?.status(), `${path} should not return 500`).toBeLessThan(500);
  expect(new URL(page.url()).pathname, `${path} redirected to login`).not.toBe("/login");
  await expect(page.getByText("Uso interno Moriah")).toBeVisible();
  await expect(page.getByRole("link", { name: "Centro de Comando" }).first()).toBeVisible();
  await expect(page.getByText("Operações").first()).toBeVisible();
}

export async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "page must not overflow horizontally").toBeLessThanOrEqual(2);
}

export async function assertNoVisibleSecrets(page: Page) {
  const text = await page.locator("body").innerText();
  for (const pattern of secretPatterns) expect(text, `visible secret pattern: ${pattern}`).not.toMatch(pattern);
}

export async function assertInternalCatalogExcludesClients(page: Page) {
  await gotoAuthenticated(page, "/operations/companies");
  const companyLinks = await page.locator('a[href^="/operations/companies/"]').allInnerTexts();
  const catalogText = companyLinks.join("\n");
  for (const client of forbiddenClients) expect(catalogText).not.toContain(client);
}

export async function assertSessionReady(page: Page) {
  await gotoAuthenticated(page, operationsBasePath);
  const path = new URL(page.url()).pathname;
  if (path !== operationsBasePath) throw new Error(`Expected /operations after auth, got ${sanitizeLog(page.url())}`);
}

export async function captureOperationScreenshot(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({ path: `test-results/operations/${testInfo.project.name}-${name}.png`, fullPage: true });
}
