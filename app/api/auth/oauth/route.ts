import { NextResponse } from "next/server";

export async function GET() {
  const loginUrl = new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  loginUrl.searchParams.set("error", "Login OAuth em implantação.");

  return NextResponse.redirect(loginUrl);
}
