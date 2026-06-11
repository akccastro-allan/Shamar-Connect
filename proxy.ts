import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const hasCookies = request.cookies.getAll().length > 0;

  if (!hasCookies) {
    return NextResponse.redirect(new URL("/login", request.url));
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
