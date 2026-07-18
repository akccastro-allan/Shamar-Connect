import assert from "node:assert/strict";
import test from "node:test";
import {
  FINALIZATION_RESERVE_MS,
  FUNCTION_BUDGET_MS,
  MIN_RETRY_BUDGET_MS,
  OpenWaGatewayError,
  OPENWA_READ_RETRY_BACKOFF_MS,
  PROVIDER_TIMEOUT_MS,
  createWhatsappGatewayClient,
} from "./whatsapp-web-gateway-client.ts";

async function withGatewayEnv<T>(callback: () => Promise<T>) {
  const previousToken = process.env.WHATSAPP_WEB_GATEWAY_TOKEN;
  const previousFetch = globalThis.fetch;
  const previousNow = Date.now;
  const previousTimeout = AbortSignal.timeout;
  process.env.WHATSAPP_WEB_GATEWAY_TOKEN = "server-token";
  try {
    return await callback();
  } finally {
    if (previousToken === undefined) delete process.env.WHATSAPP_WEB_GATEWAY_TOKEN;
    else process.env.WHATSAPP_WEB_GATEWAY_TOKEN = previousToken;
    globalThis.fetch = previousFetch;
    Date.now = previousNow;
    AbortSignal.timeout = previousTimeout;
  }
}

async function primeSessionCache(baseUrl: string, sessionName: "lips-01" | "lips-02" | "lips-03" | "lips-04") {
  const client = createWhatsappGatewayClient(sessionName, { baseUrl });
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/api/sessions")) return new Response(JSON.stringify([{ id: `${sessionName}-uuid`, name: sessionName, status: "ready" }]), { status: 200, headers: { "content-type": "application/json" } });
    if (url.includes("/chats")) return new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
  }) as typeof fetch;
  await client.listChats({ limit: 1, offset: 0 });
  return client;
}

test("OpenWA time budget fits listChats retry and finalization reserve", () => {
  assert.equal(PROVIDER_TIMEOUT_MS.listChats < FUNCTION_BUDGET_MS, true);
  assert.equal(PROVIDER_TIMEOUT_MS.status < FUNCTION_BUDGET_MS, true);
  assert.equal(PROVIDER_TIMEOUT_MS.listMessages < FUNCTION_BUDGET_MS, true);
  assert.equal(2 * PROVIDER_TIMEOUT_MS.listChats + OPENWA_READ_RETRY_BACKOFF_MS + FINALIZATION_RESERVE_MS <= FUNCTION_BUDGET_MS, true);
});

test("OpenWA gateway client retries read session lookup and sends chat pagination query", async () => withGatewayEnv(async () => {
  const urls: string[] = [];
  const headers: Array<Record<string, string>> = [];
  let sessionAttempts = 0;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    urls.push(url);
    headers.push(init?.headers as Record<string, string>);

    if (url.endsWith("/api/sessions")) {
      sessionAttempts += 1;
      if (sessionAttempts === 1) return new Response(JSON.stringify({ error: "temporary" }), { status: 502 });
      return new Response(JSON.stringify([{ id: "session-123", name: "lips-01", status: "ready" }]), { status: 200, headers: { "content-type": "application/json" } });
    }

    if (url.endsWith("/api/sessions/session-123/chats?limit=5&offset=10")) {
      return new Response(JSON.stringify([{ id: "5511999999999@c.us", name: "Cliente", isGroup: false }]), { status: 200, headers: { "content-type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
  }) as typeof fetch;

  const client = createWhatsappGatewayClient("lips-01", { baseUrl: "https://gateway-pagination-test.example.com" });
  const chats = await client.listChats({ limit: 5, offset: 10 });

  assert.equal(sessionAttempts, 2);
  assert.equal(chats.length, 1);
  assert.equal(chats[0]?.id, "5511999999999@c.us");
  assert.deepEqual(urls, [
    "https://gateway-pagination-test.example.com/api/sessions",
    "https://gateway-pagination-test.example.com/api/sessions",
    "https://gateway-pagination-test.example.com/api/sessions/session-123/chats?limit=5&offset=10",
  ]);
  assert.equal(headers.every((header) => header["x-api-key"] === "server-token"), true);
  assert.equal(headers.every((header) => header.authorization === "Bearer server-token"), true);
}));

test("OpenWA retry uses remaining budget instead of restarting full timeout", async () => withGatewayEnv(async () => {
  const client = await primeSessionCache("https://gateway-remaining-budget.example.com", "lips-02");
  const timeouts: number[] = [];
  let chatAttempts = 0;
  const nowValues = [1_000, 39_000, 50_500, 51_500];
  Date.now = () => nowValues.shift() ?? 51_500;
  AbortSignal.timeout = ((ms: number) => {
    timeouts.push(ms);
    return new AbortController().signal;
  }) as typeof AbortSignal.timeout;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/chats")) {
      chatAttempts += 1;
      if (chatAttempts === 1) return new Response(JSON.stringify({ error: "temporary" }), { status: 503 });
      return new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
  }) as typeof fetch;

  await client.listChats({ limit: 5, offset: 0 });

  assert.equal(chatAttempts, 2);
  assert.deepEqual(timeouts, [14_000, 1_500]);
}));

test("OpenWA retry is skipped when finalization budget would be unsafe", async () => withGatewayEnv(async () => {
  const client = await primeSessionCache("https://gateway-insufficient-budget.example.com", "lips-03");
  let chatAttempts = 0;
  const nowValues = [1_000, 39_000, FUNCTION_BUDGET_MS - FINALIZATION_RESERVE_MS - MIN_RETRY_BUDGET_MS + 1_000 + 1];
  Date.now = () => nowValues.shift() ?? nowValues.at(-1)!;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).includes("/chats")) {
      chatAttempts += 1;
      return new Response(JSON.stringify({ error: "temporary" }), { status: 503 });
    }
    return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
  }) as typeof fetch;

  await assert.rejects(() => client.listChats({ limit: 5, offset: 0 }), (error: unknown) => {
    assert.equal(error instanceof OpenWaGatewayError, true);
    assert.equal((error as OpenWaGatewayError).retrySkippedReason, "insufficient_time_budget");
    return true;
  });
  assert.equal(chatAttempts, 1);
}));

test("OpenWA does not retry unauthorized responses", async () => withGatewayEnv(async () => {
  const client = await primeSessionCache("https://gateway-no-auth-retry.example.com", "lips-04");
  let chatAttempts = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).includes("/chats")) {
      chatAttempts += 1;
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    }
    return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
  }) as typeof fetch;

  await assert.rejects(() => client.listChats({ limit: 5, offset: 0 }), (error: unknown) => {
    assert.equal(error instanceof OpenWaGatewayError, true);
    assert.equal((error as OpenWaGatewayError).code, "openwa_unauthorized");
    return true;
  });
  assert.equal(chatAttempts, 1);
}));
