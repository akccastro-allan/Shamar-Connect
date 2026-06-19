import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
