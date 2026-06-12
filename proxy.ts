import { NextRequest, NextResponse } from "next/server";

const SHAMAR_SESSION_COOKIE = "shamar_connect_session";

function isLikelyValidSession(value?: string) {
  if (!value) return false;

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf-8"));
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
    "/crm/:path*",
    "/settings/:path*",
    "/contacts/:path*",
    "/companies/:path*",
  ],
};
