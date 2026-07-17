import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { commandCenterEntities } from "../admin/command-center-config.ts";
import { getOperationsCompanySlugs, internalWhatsappSessions, isAllowedOperationsCompanySlug } from "./command-center-scope.ts";

test("operations selector only allows internal company slugs", () => {
  assert.equal(isAllowedOperationsCompanySlug("moriah-systems"), true);
  assert.equal(isAllowedOperationsCompanySlug("allan-pessoal"), true);
  assert.equal(isAllowedOperationsCompanySlug("viciados-em-trilhas"), true);
  assert.equal(isAllowedOperationsCompanySlug("lips"), false);
  assert.equal(isAllowedOperationsCompanySlug("hall"), false);
  assert.equal(isAllowedOperationsCompanySlug("nutriflow"), false);
});

test("operations company catalog excludes SaaS clients", () => {
  const names = commandCenterEntities.map((entity) => entity.name.toLowerCase());
  const slugs = getOperationsCompanySlugs();

  assert.equal(names.includes("lips"), false);
  assert.equal(names.includes("hall"), false);
  assert.equal(names.includes("nutriflow"), false);
  assert.equal(slugs.includes("lips"), false);
  assert.equal(slugs.includes("hall"), false);
  assert.equal(slugs.includes("nutriflow"), false);
});

test("operations internal whatsapp sessions exclude Lips and Hall", () => {
  assert.equal(internalWhatsappSessions.includes("shamar-main"), true);
  assert.equal(internalWhatsappSessions.includes("lips-main" as never), false);
  assert.equal(internalWhatsappSessions.includes("hall-main" as never), false);
});

test("operations UI does not reference secret social token fields", () => {
  const source = readFileSync("components/operations/operations-command-center.tsx", "utf8");
  assert.equal(source.includes("access_token"), false);
  assert.equal(source.includes("verify_token"), false);
  assert.equal(source.includes("agent_token_hash"), false);
  assert.equal(source.includes("install_key_hash"), false);
});
