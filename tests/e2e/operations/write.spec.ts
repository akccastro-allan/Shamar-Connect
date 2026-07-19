import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import {
  assertAllowedSmokeCompany,
  assertInternalCatalogExcludesClients,
  assertLocalAuthenticatedSmoke,
  assertSessionReady,
  gotoAuthenticated,
  lowRiskCompanyLabel,
  smokePrefix,
  storageStatePath,
} from "./helpers";

const titleSuffix = new Date().toISOString().replace(/[:.]/g, "-");
const taskTitle = `${smokePrefix} Teste de tarefa ${titleSuffix}`;
const eventTitle = `${smokePrefix} Teste de agenda ${titleSuffix}`;
const contentTitle = `${smokePrefix} Teste de conteúdo ${titleSuffix}`;

test.beforeAll(() => {
  assertLocalAuthenticatedSmoke();
  assertAllowedSmokeCompany();
  if (process.env.OPERATIONS_WRITE_SMOKE !== "true" || process.env.OPERATIONS_WRITE_CONFIRMED !== "true") {
    throw new Error("Write smoke requires OPERATIONS_WRITE_SMOKE=true and the local confirmation wrapper.");
  }
  if (!existsSync(storageStatePath)) throw new Error(`Missing storage state at ${storageStatePath}. Run npm run e2e:auth first.`);
});

test("controlled write smoke for operations command center", async ({ page }) => {
  await assertSessionReady(page);
  await assertInternalCatalogExcludesClients(page);
  await assertWriteUiCanCompleteWithoutOrphans(page);

  await createTask(page);
  await editAndCompleteTask(page);
  await createEvent(page);
  await editAndCancelEvent(page);
  await createContentDraft(page);
  await moveContentToReviewAndApproved(page);
  await confirmAudit(page);
});

async function assertWriteUiCanCompleteWithoutOrphans(page: import("@playwright/test").Page) {
  await gotoAuthenticated(page, "/operations/tasks");
  await expect(page.getByRole("button", { name: "Criar tarefa" })).toBeVisible();
  const canEditTask = await page.getByRole("button", { name: /editar tarefa|salvar tarefa|concluir tarefa/i }).or(page.getByRole("link", { name: /editar tarefa|concluir tarefa/i })).count();

  await gotoAuthenticated(page, "/operations/calendar");
  await expect(page.getByRole("button", { name: "Criar evento" })).toBeVisible();
  const canEditEvent = await page.getByRole("button", { name: /editar evento|salvar evento|cancelar evento/i }).or(page.getByRole("link", { name: /editar evento|cancelar evento/i })).count();

  await gotoAuthenticated(page, "/operations/content");
  await expect(page.getByRole("button", { name: "Salvar conteúdo" })).toBeVisible();
  const canEditContent = await page.getByRole("button", { name: /editar conteúdo|salvar rascunho existente|aprovar conteúdo/i }).or(page.getByRole("link", { name: /editar conteúdo|aprovar conteúdo/i })).count();

  if (canEditTask === 0 || canEditEvent === 0 || canEditContent === 0) {
    throw new Error("Smoke de escrita abortado antes de mutar: a UI atual não expõe edição por registro para concluir tarefa, cancelar evento e aprovar conteúdo sem criar órfãos.");
  }
}

async function createTask(page: import("@playwright/test").Page) {
  await gotoAuthenticated(page, "/operations/tasks");
  await page.getByLabel("Empresa").selectOption({ label: lowRiskCompanyLabel });
  await page.getByLabel("Título").fill(taskTitle);
  await page.getByLabel("Descrição").fill(`${smokePrefix} Criada pelo smoke E2E controlado.`);
  await page.getByLabel("Prioridade").selectOption("high");
  await page.getByRole("button", { name: "Criar tarefa" }).click();
  await expect(page.getByText("Tarefa criada.")).toBeVisible();
  await expect(page.getByText(taskTitle)).toBeVisible();
}

async function editAndCompleteTask(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /editar tarefa|concluir tarefa/i }).first().click();
  await page.getByLabel("Status").selectOption("completed");
  await page.getByRole("button", { name: /salvar tarefa|concluir tarefa/i }).first().click();
}

async function createEvent(page: import("@playwright/test").Page) {
  await gotoAuthenticated(page, "/operations/calendar");
  await page.getByLabel("Empresa").selectOption({ label: lowRiskCompanyLabel });
  await page.getByLabel("Título").fill(eventTitle);
  await page.getByLabel("Início").fill(nextLocalDateTime(1));
  await page.getByLabel("Fim").fill(nextLocalDateTime(2));
  await page.getByLabel("Descrição").fill(`${smokePrefix} Evento criado pelo smoke E2E controlado.`);
  await page.getByRole("button", { name: "Criar evento" }).click();
  await expect(page.getByText("Evento criado.")).toBeVisible();
  await expect(page.getByText(eventTitle)).toBeVisible();
}

async function editAndCancelEvent(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /editar evento|cancelar evento/i }).first().click();
  await page.getByLabel("Status").selectOption("cancelled");
  await page.getByRole("button", { name: /salvar evento|cancelar evento/i }).first().click();
}

async function createContentDraft(page: import("@playwright/test").Page) {
  await gotoAuthenticated(page, "/operations/content");
  await page.getByLabel("Empresa").selectOption({ label: lowRiskCompanyLabel });
  await page.getByLabel("Título").fill(contentTitle);
  await page.getByLabel("Texto").fill(`${smokePrefix} Conteúdo criado pelo smoke E2E controlado.`);
  await page.getByLabel("Fluxo").selectOption("draft");
  await page.getByRole("button", { name: "Salvar conteúdo" }).click();
  await expect(page.getByText("Rascunho criado.")).toBeVisible();
  await expect(page.getByText(contentTitle)).toBeVisible();
}

async function moveContentToReviewAndApproved(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /editar conteúdo|aprovar conteúdo/i }).first().click();
  await page.getByLabel("Fluxo").selectOption("review");
  await page.getByRole("button", { name: /salvar conteúdo|aprovar conteúdo/i }).first().click();
  await page.getByLabel("Fluxo").selectOption("approved");
  await page.getByRole("button", { name: /salvar conteúdo|aprovar conteúdo/i }).first().click();
}

async function confirmAudit(page: import("@playwright/test").Page) {
  await gotoAuthenticated(page, "/operations/audit");
  await expect(page.getByText("operations.task.create").first()).toBeVisible();
  await expect(page.getByText("operations.event.create").first()).toBeVisible();
  await expect(page.getByText("operations.content.create").first()).toBeVisible();
}

function nextLocalDateTime(hoursAhead: number) {
  const date = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
