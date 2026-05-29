import { cookies } from "next/headers";

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

export function encodeSession(session: ShamarSession) {
  return Buffer.from(JSON.stringify(session), "utf-8").toString("base64url");
}

export function decodeSession(value?: string | null): ShamarSession | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf-8"));
    if (!parsed?.companyId || !parsed?.userId) return null;
    return parsed as ShamarSession;
  } catch {
    return null;
  }
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(SHAMAR_SESSION_COOKIE)?.value);
}

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
