import assert from "node:assert/strict";
import test from "node:test";
import { buildSessionId, isValidSessionId, parseSessionId } from "./session-id.ts";

test("session id accepts 01 and 09 with lowercase hyphen slugs", () => {
  assert.equal(isValidSessionId("viciados-01"), true);
  assert.equal(isValidSessionId("shamar-kids-09"), true);
  assert.deepEqual(parseSessionId("shamar-kids-09"), { companySlug: "shamar-kids", sequence: 9 });
});

test("session id rejects invalid sequences and formats", () => {
  assert.equal(isValidSessionId("viciados-00"), false);
  assert.equal(isValidSessionId("viciados-10"), false);
  assert.equal(isValidSessionId("Empresa-01"), false);
  assert.equal(isValidSessionId("empresa_01"), false);
  assert.equal(isValidSessionId("empresa-main"), false);
});

test("build session id only allows sequences from 1 to 9", () => {
  assert.equal(buildSessionId("oriahfin", 1), "oriahfin-01");
  assert.equal(buildSessionId("shamar-kids", 9), "shamar-kids-09");
  assert.throws(() => buildSessionId("shamar_kids", 1));
  assert.throws(() => buildSessionId("oriahfin", 10));
});
