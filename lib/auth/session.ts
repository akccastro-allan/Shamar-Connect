import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { cache } from "react";

export const SHAMAR_SESSION_COOKIE = "shamar_connect_session";

export type ShamarSession = {
  companyId: string;
  companyName: string;
  documentType: "cpf" | "cnpj";
  documentNumber: string;
  userId: string;
  userName: string;
  userRole: "owner" | "admin" | "attendant" | "viewer";
  loginAt: string;
};

export function normalizeDocument(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET env var is missing or too short (min 32 chars)");
  }
  return secret;
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function encodeSession(session: ShamarSession): string {
  const secret = getSecret();
  const payload = Buffer.from(JSON.stringify(session), "utf-8").toString("base64url");
  const sig = signPayload(payload, secret);
  return `${payload}.${sig}`;
}

export function decodeSession(value?: string | null): ShamarSession | null {
  if (!value) return null;
  try {
    const dotIndex = value.lastIndexOf(".");
    if (dotIndex === -1) return null; // unsigned cookie — reject

    const payload = value.slice(0, dotIndex);
    const sig = value.slice(dotIndex + 1);

    const secret = getSecret();
    const expected = signPayload(payload, secret);

    const sigBuf = Buffer.from(sig, "base64url");
    const expectedBuf = Buffer.from(expected, "base64url");

    // timing-safe comparison prevents timing attacks on the signature
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (!parsed?.companyId || !parsed?.userId) return null;
    return parsed as ShamarSession;
  } catch {
    return null;
  }
}

export const getCurrentSession = cache(async () => {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(SHAMAR_SESSION_COOKIE)?.value);
});

export async function setSessionCookie(session: ShamarSession) {
  const cookieStore = await cookies();
  cookieStore.set(SHAMAR_SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SHAMAR_SESSION_COOKIE);
}
