import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import {
  assertLocalAuthenticatedSmoke,
  assertNoVisibleSecrets,
  gotoAuthenticated,
  sanitizeLog,
  storageStatePath,
} from "./helpers";

const evidencePath = "test-results/operations/lips-readiness.json";

type IntegrityCounts = {
  syncState: number;
  syncRuns: number;
  conversations: number;
  messages: number;
  media: number;
  queueStatusNull: number;
  locks: number;
  sentMessages: number;
};

type Evidence = {
  timestamp: string;
  environment: string;
  status: string;
  health: { httpStatus: number; ok: boolean };
  readiness: { httpStatus: number; ok: boolean };
  session: { lipsMainFound: boolean; lipsMainReady: boolean; status: string; phoneMasked: boolean };
  featureExecute: boolean;
  pagination: {
    page1: { limit: number; offset: number; count: number; durationMs: number };
    page2: { limit: number; offset: number; count: number; durationMs: number };
    overlap: number;
    limitRespected: boolean;
    offsetProved: boolean;
    enoughVolume: boolean;
  };
  integrity: {
    before: IntegrityCounts;
    after: IntegrityCounts;
    deltas: IntegrityCounts;
    readOnlyPreserved: boolean;
  };
  decision: string;
  blockers: string[];
};

test.beforeAll(() => {
  assertLocalAuthenticatedSmoke();
  if (!existsSync(storageStatePath)) throw new Error(`Missing storage state at ${storageStatePath}. Run npm run e2e:auth first.`);
});

test("Lips readiness stays read-only and sanitized", async ({ page }) => {
  const blockers: string[] = [];
  page.on("pageerror", (error) => blockers.push(sanitizeLog(error.message)));
  page.on("console", (message) => {
    if (message.type() === "error") blockers.push(sanitizeLog(message.text()));
  });

  await gotoAuthenticated(page, "/operations/diagnostics/whatsapp-sync");
  const root = page.getByTestId("lips-readiness-page");
  await expect(root).toHaveAttribute("data-feature-execute", "false");
  await expect(page.getByTestId("lips-bootstrap-button")).toBeDisabled();
  await expect(page.getByTestId("lips-incremental-button")).toBeDisabled();
  await expect(page.getByTestId("lips-reconciliation-button")).toBeDisabled();

  await page.getByTestId("lips-status-button").click();
  const gateway = page.getByTestId("lips-gateway-status");
  await expect(gateway).toBeVisible({ timeout: 30_000 });
  await expect(gateway).toHaveAttribute("data-health-http-status", "200");
  await expect(gateway).toHaveAttribute("data-readiness-http-status", "200");
  await expect(gateway).toHaveAttribute("data-lips-main-found", "true");
  await expect(gateway).toHaveAttribute("data-lips-main-ready", "true");
  const phoneMasked = await gateway.getAttribute("data-phone-masked");
  const safePhoneMasked = phoneMasked || "";
  expect(safePhoneMasked, "telefone deve estar mascarado").toMatch(/^[^0-9]*\d{2,3}\D+\d{2,3}[^0-9]*$/);

  await assertPageIsSanitized(page);

  await page.getByTestId("lips-validate-pagination-button").click();
  const pagination = page.getByTestId("lips-pagination-validation");
  await expect(pagination).toBeVisible({ timeout: 45_000 });
  const page1 = await readPageAttrs(pagination, "page1");
  const page2 = await readPageAttrs(pagination, "page2");
  const overlap = await intAttr(pagination, "data-overlap-count");
  const limitRespected = await boolAttr(pagination, "data-limit-respected");
  const offsetProved = await boolAttr(pagination, "data-offset-proved");
  const enoughVolume = await boolAttr(pagination, "data-enough-volume");

  expect(page1.limit).toBe(5);
  expect(page1.offset).toBe(0);
  expect(page1.count).toBeGreaterThanOrEqual(0);
  expect(page1.count).toBeLessThanOrEqual(5);
  expect(page1.durationMs).toBeLessThan(20_000);
  expect(page2.limit).toBe(5);
  expect(page2.offset).toBe(5);
  expect(page2.count).toBeGreaterThanOrEqual(0);
  expect(page2.count).toBeLessThanOrEqual(5);
  expect(page2.durationMs).toBeLessThan(20_000);
  expect(limitRespected).toBe(true);
  if (enoughVolume) expect(overlap).toBe(0);

  await assertPageIsSanitized(page);

  await page.getByTestId("lips-capture-baseline-button").click();
  const baselineCard = page.getByTestId("lips-integrity-snapshot");
  await expect(baselineCard).toBeVisible({ timeout: 30_000 });
  const before = await readIntegrityAttrs(baselineCard);

  await page.getByTestId("lips-capture-current-button").click();
  const currentCard = page.getByTestId("lips-integrity-snapshot");
  await expect(currentCard).toHaveAttribute("data-capture-role", "current", { timeout: 30_000 });
  await page.getByTestId("lips-compare-integrity").click();
  await expect(page.getByTestId("lips-comparison-confirmed")).toBeVisible();
  const after = await readIntegrityAttrs(currentCard);
  const deltas = await readDeltaAttrs(currentCard);
  const readOnlyPreserved = await boolAttr(currentCard, "data-read-only-preserved");

  expect(readOnlyPreserved).toBe(true);
  for (const [field, delta] of Object.entries(deltas)) {
    expect(delta, `${field} alterado por smoke read-only`).toBe(0);
  }
  expect(blockers).toEqual([]);

  const evidence: Evidence = {
    timestamp: new Date().toISOString(),
    environment: (await root.getAttribute("data-environment")) || "unknown",
    status: "completed",
    health: { httpStatus: await intAttr(gateway, "data-health-http-status"), ok: true },
    readiness: { httpStatus: await intAttr(gateway, "data-readiness-http-status"), ok: true },
    session: {
      lipsMainFound: await boolAttr(gateway, "data-lips-main-found"),
      lipsMainReady: await boolAttr(gateway, "data-lips-main-ready"),
      status: (await gateway.getAttribute("data-lips-main-status")) || "unknown",
      phoneMasked: Boolean(safePhoneMasked) && !/\d{10,13}/.test(safePhoneMasked),
    },
    featureExecute: await boolAttr(root, "data-feature-execute"),
    pagination: { page1, page2, overlap, limitRespected, offsetProved, enoughVolume },
    integrity: { before, after, deltas, readOnlyPreserved },
    decision: enoughVolume ? "readiness_aprovado" : "volume insuficiente para comprovar duas páginas completas",
    blockers: blockers.map(sanitizeLog),
  };

  await mkdir("test-results/operations", { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
});

async function assertPageIsSanitized(page: import("@playwright/test").Page) {
  await assertNoVisibleSecrets(page);
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/https?:\/\/[^\s]+/i);
  expect(text).not.toMatch(/\b\d{10,13}\b/);
  expect(text).not.toMatch(/@c\.us|@g\.us|external_chat_id|fingerprints_page|Authori[sz]ation|Cookie/i);
}

async function readPageAttrs(locator: import("@playwright/test").Locator, pageName: "page1" | "page2") {
  return {
    limit: await intAttr(locator, `data-${pageName}-limit`),
    offset: await intAttr(locator, `data-${pageName}-offset`),
    count: await intAttr(locator, `data-${pageName}-count`),
    durationMs: await intAttr(locator, `data-${pageName}-duration-ms`),
  };
}

async function readIntegrityAttrs(locator: import("@playwright/test").Locator): Promise<IntegrityCounts> {
  return {
    syncState: await intAttr(locator, "data-sync-state"),
    syncRuns: await intAttr(locator, "data-sync-runs"),
    conversations: await intAttr(locator, "data-conversations"),
    messages: await intAttr(locator, "data-messages"),
    media: await intAttr(locator, "data-media"),
    queueStatusNull: await intAttr(locator, "data-queue-status-null"),
    locks: await intAttr(locator, "data-locks"),
    sentMessages: await intAttr(locator, "data-sent-messages"),
  };
}

async function readDeltaAttrs(locator: import("@playwright/test").Locator): Promise<IntegrityCounts> {
  return {
    syncState: await intAttr(locator, "data-delta-sync-state"),
    syncRuns: await intAttr(locator, "data-delta-sync-runs"),
    conversations: await intAttr(locator, "data-delta-conversations"),
    messages: await intAttr(locator, "data-delta-messages"),
    media: await intAttr(locator, "data-delta-media"),
    queueStatusNull: await intAttr(locator, "data-delta-queue-status-null"),
    locks: await intAttr(locator, "data-delta-locks"),
    sentMessages: await intAttr(locator, "data-delta-sent-messages"),
  };
}

async function intAttr(locator: import("@playwright/test").Locator, name: string) {
  const value = await locator.getAttribute(name);
  return Number(value || 0);
}

async function boolAttr(locator: import("@playwright/test").Locator, name: string) {
  return (await locator.getAttribute(name)) === "true";
}
