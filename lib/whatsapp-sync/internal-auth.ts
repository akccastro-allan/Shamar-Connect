import { createHash, timingSafeEqual } from "crypto";

function hashToken(value: string) {
  return createHash("sha256").update(value).digest();
}

export function hasValidInternalApiKey(expectedToken: string, receivedToken: string | null | undefined) {
  const expected = expectedToken.trim();
  const received = receivedToken?.trim() || "";
  if (!expected || !received) return false;
  return timingSafeEqual(hashToken(expected), hashToken(received));
}
