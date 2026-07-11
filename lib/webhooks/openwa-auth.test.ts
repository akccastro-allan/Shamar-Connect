import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyOpenWaWebhookRequest } from "./openwa-auth.ts";

function headers(values: Record<string, string>) {
  const normalized = new Map(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    get(name: string) {
      return normalized.get(name.toLowerCase()) || null;
    },
  };
}

test("OpenWA webhook accepts configured production secret in supported gateway header", () => {
  const ok = verifyOpenWaWebhookRequest("{}", headers({ "x-openwa-webhook-secret": "test-secret" }), {
    NODE_ENV: "production",
    OPENWA_WEBHOOK_SECRET: "test-secret",
  });

  assert.equal(ok, true);
});

test("OpenWA webhook rejects production request without configured secret header", () => {
  const ok = verifyOpenWaWebhookRequest("{}", headers({}), {
    NODE_ENV: "production",
    OPENWA_WEBHOOK_SECRET: "test-secret",
  });

  assert.equal(ok, false);
});

test("OpenWA webhook rejects production request with wrong secret", () => {
  const ok = verifyOpenWaWebhookRequest("{}", headers({ "x-openwa-webhook-secret": "wrong" }), {
    NODE_ENV: "production",
    OPENWA_WEBHOOK_SECRET: "test-secret",
  });

  assert.equal(ok, false);
});

test("OpenWA webhook accepts HMAC signature when gateway supports it", () => {
  const rawBody = JSON.stringify({ event: "message.received" });
  const secret = "test-secret";
  const signature = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const ok = verifyOpenWaWebhookRequest(rawBody, headers({ "x-openwa-signature": signature }), {
    NODE_ENV: "production",
    OPENWA_WEBHOOK_SECRET: secret,
  });

  assert.equal(ok, true);
});

test("OpenWA webhook allows controlled development when no secret is configured", () => {
  const ok = verifyOpenWaWebhookRequest("{}", headers({}), {
    NODE_ENV: "development",
  });

  assert.equal(ok, true);
});

test("OpenWA webhook rejects production when no server secret is configured", () => {
  const ok = verifyOpenWaWebhookRequest("{}", headers({}), {
    NODE_ENV: "production",
  });

  assert.equal(ok, false);
});
