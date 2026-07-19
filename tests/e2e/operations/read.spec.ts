import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import {
  assertInternalCatalogExcludesClients,
  assertLocalAuthenticatedSmoke,
  assertNoHorizontalOverflow,
  assertNoVisibleSecrets,
  gotoAuthenticated,
  sanitizeLog,
  storageStatePath,
} from "./helpers";

const routes = [
  "/operations",
  "/operations/companies",
  "/operations/channels",
  "/operations/social",
  "/operations/content",
  "/operations/calendar",
  "/operations/tasks",
  "/operations/commercial",
  "/operations/integrations",
  "/operations/diagnostics",
  "/operations/diagnostics/whatsapp-sync",
  "/operations/audit",
];

test.beforeAll(() => {
  assertLocalAuthenticatedSmoke();
  if (!existsSync(storageStatePath)) throw new Error(`Missing storage state at ${storageStatePath}. Run npm run e2e:auth first.`);
});

for (const route of routes) {
  test(`read-only smoke ${route}`, async ({ page }) => {
    const clientErrors: string[] = [];
    page.on("pageerror", (error) => clientErrors.push(sanitizeLog(error.message)));
    page.on("console", (message) => {
      if (message.type() === "error") clientErrors.push(sanitizeLog(message.text()));
    });

    await gotoAuthenticated(page, route);
    await assertNoHorizontalOverflow(page);
    await assertNoVisibleSecrets(page);
    expect(clientErrors, `unhandled client errors on ${route}`).toEqual([]);
  });
}

test("internal catalog excludes SaaS clients", async ({ page }) => {
  await assertInternalCatalogExcludesClients(page);
});

test("write controls stay disabled when feature is unavailable", async ({ page }) => {
  await gotoAuthenticated(page, "/operations/diagnostics/whatsapp-sync");
  const bootstrap = page.getByRole("button", { name: "Bootstrap controlado" });
  if (await page.getByText("Execuções de escrita desabilitadas").isVisible()) {
    await expect(bootstrap).toBeDisabled();
  }
});
