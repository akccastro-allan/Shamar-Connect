export const SHAMAR_ACCESS_COOKIE = "shamar_access";
export const SHAMAR_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 8;

const ACCESS_TOKEN_PURPOSE = "shamar-emergency-access";

type AccessTokenPayload = {
  v: 1;
  purpose: typeof ACCESS_TOKEN_PURPOSE;
  iat: number;
  exp: number;
};

export function getAccessCookieName() {
  return SHAMAR_ACCESS_COOKIE;
}

export function getAccessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SHAMAR_ACCESS_MAX_AGE_SECONDS,
  };
}

function getAccessSecret() {
  return process.env.SHAMAR_APP_ACCESS_SECRET || process.env.SHAMAR_APP_ACCESS_PASSWORD || null;
}

function base64UrlEncode(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeToString(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

async function signTokenPart(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));

  return base64UrlEncode(new Uint8Array(signature));
}

function safeStringEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

export async function createAccessToken() {
  const secret = getAccessSecret();

  if (!secret) {
    throw new Error("SHAMAR_APP_ACCESS_SECRET ou SHAMAR_APP_ACCESS_PASSWORD precisa estar configurada.");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: AccessTokenPayload = {
    v: 1,
    purpose: ACCESS_TOKEN_PURPOSE,
    iat: now,
    exp: now + SHAMAR_ACCESS_MAX_AGE_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await signTokenPart(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export async function verifyAccessToken(token?: string | null) {
  if (!token) return false;

  const secret = getAccessSecret();
  if (!secret) return false;

  const tokenParts = token.split(".");
  if (tokenParts.length !== 2) return false;

  const [encodedPayload, receivedSignature] = tokenParts;
  if (!encodedPayload || !receivedSignature) return false;

  const expectedSignature = await signTokenPart(encodedPayload, secret);
  if (!safeStringEqual(expectedSignature, receivedSignature)) return false;

  try {
    const payload = JSON.parse(base64UrlDecodeToString(encodedPayload)) as Partial<AccessTokenPayload>;
    const now = Math.floor(Date.now() / 1000);

    return payload.v === 1 && payload.purpose === ACCESS_TOKEN_PURPOSE && typeof payload.exp === "number" && payload.exp > now;
  } catch {
    return false;
  }
}
