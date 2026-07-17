import { NextRequest, NextResponse } from "next/server";

const SHAMAR_SESSION_COOKIE = "shamar_connect_session";

function hasValidCookieFormat(value?: string): boolean {
  if (!value) return false;
  // New format: base64url(payload).base64url(hmac-sig)
  const dotIndex = value.lastIndexOf(".");
  if (dotIndex === -1) return false;
  const payload = value.slice(0, dotIndex);
  if (!payload) return false;
  try {
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "="));
    const parsed = JSON.parse(decoded);
    return Boolean(parsed?.companyId && parsed?.userId);
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const session = request.cookies.get(SHAMAR_SESSION_COOKIE)?.value;

  if (!hasValidCookieFormat(session)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/financeiro/:path*",
    "/inbox/:path*",
    "/whatsapp-messages/:path*",
    "/whatsapp-diagnostics/:path*",
    "/whatsapp-import/:path*",
    "/settings/:path*",
    "/contacts/:path*",
    "/contact-import/:path*",
    "/crm/:path*",
    "/pipeline/:path*",
    "/sales-dashboard/:path*",
    "/campaigns/:path*",
    "/distribution/:path*",
    "/support/:path*",
    "/operations/:path*",
    "/social-inbox/:path*",
    "/ai-lab/:path*",
    "/quick-replies/:path*",
    "/conversation-flows/:path*",
    "/automations/:path*",
    "/knowledge/:path*",
    "/group-import-lists/:path*",
    "/system-test/:path*",
    "/ui-lab/:path*",
    "/feature-lab/:path*",
    "/audit/:path*",
    "/auth-diagnostics/:path*",
    "/auth-diagnostics",
  ],
};
