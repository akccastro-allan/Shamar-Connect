import { createHmac, timingSafeEqual } from "crypto";

type HeaderReader = {
  get(name: string): string | null;
};

type OpenWaWebhookEnv = {
  OPENWA_WEBHOOK_SECRET?: string;
  SHAMARCONNECT_WEBHOOK_TOKEN?: string;
  NODE_ENV?: string;
};

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export function verifyOpenWaWebhookRequest(
  rawBody: string,
  headers: HeaderReader,
  env: OpenWaWebhookEnv = process.env,
) {
  const secret = env.OPENWA_WEBHOOK_SECRET || env.SHAMARCONNECT_WEBHOOK_TOKEN || "";

  if (!secret) return env.NODE_ENV !== "production";

  const rawSecret = headers.get("x-openwa-webhook-secret");
  if (rawSecret && safeEqual(rawSecret, secret)) return true;

  const signature = headers.get("x-openwa-signature");
  if (!signature?.startsWith("sha256=")) return false;

  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  return safeEqual(signature, expected);
}
