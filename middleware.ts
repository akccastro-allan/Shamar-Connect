import { NextRequest, NextResponse } from "next/server";
export function middleware(request: NextRequest) {
  const p = request.nextUrl.pathname;
  const pub = ["/login", "/terms", "/privacy", "/forgot-password"];
  const open = pub.some(x => p.startsWith(x)) || p.startsWith("/api/auth/") || p.startsWith("/_next/") || p.startsWith("/favicon") || p.startsWith("/brand/");
  if (open) return NextResponse.next();
  const hasAuth = request.cookies.getAll().some(c => c.name.includes("auth-token"));
  return hasAuth ? NextResponse.next() : NextResponse.redirect(new URL("/login", request.url));
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
