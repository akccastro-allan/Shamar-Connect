import assert from "node:assert/strict";
import test from "node:test";
import { hasValidInternalApiKey } from "./internal-auth.ts";

test("internal sync auth fails closed and accepts only the configured key", () => {
  assert.equal(hasValidInternalApiKey("", "anything"), false);
  assert.equal(hasValidInternalApiKey("expected", null), false);
  assert.equal(hasValidInternalApiKey("expected", "wrong"), false);
  assert.equal(hasValidInternalApiKey("expected", "expected"), true);
});
