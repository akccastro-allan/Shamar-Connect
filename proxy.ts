import { NextRequest, NextResponse } from "next/server";

const SHAMAR_SESSION_COOKIE = "shamar_connect_session";

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");

  return atob(padded);
}

function isLikelyValidSession(value?: string) {
  if (!value) return false;

  try {
    const parsed = JSON.parse(decodeBase64Url(value));
    return Boolean(parsed?.companyId && parsed?.userId && parsed?.loginAt);
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const session = request.cookies.get(SHAMAR_SESSION_COOKIE)?.value;

  if (!isLikelyValidSession(session)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/inbox/:path*",
    "/whatsapp-messages/:path*",
    "/settings/:path*",
    "/contacts/:path*",
    "/crm/:path*",
    "/pipeline/:path*",
    "/campaigns/:path*",
    "/quick-replies/:path*",
    "/conversation-flows/:path*",
    "/automations/:path*",
    "/knowledge/:path*",
    "/whatsapp-import/:path*",
    "/contact-import/:path*",
    "/group-import-lists/:path*",
    "/system-test/:path*",
    "/ui-lab/:path*",
    "/feature-lab/:path*",
    "/audit/:path*",
    "/companies/:path*"
  ],
};
