import { test } from "@playwright/test";
import { existsSync } from "node:fs";
import {
  assertLocalAuthenticatedSmoke,
  assertNoHorizontalOverflow,
  assertNoVisibleSecrets,
  captureOperationScreenshot,
  gotoAuthenticated,
  storageStatePath,
} from "./helpers";

const viewports = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "390x844", width: 390, height: 844 },
];

test.beforeAll(() => {
  assertLocalAuthenticatedSmoke();
  if (!existsSync(storageStatePath)) throw new Error(`Missing storage state at ${storageStatePath}. Run npm run e2e:auth first.`);
});

for (const viewport of viewports) {
  test(`visual operations ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await gotoAuthenticated(page, "/operations");
    await assertNoHorizontalOverflow(page);
    await assertNoVisibleSecrets(page);
    await captureOperationScreenshot(page, testInfo, viewport.name);
  });
}
