import { NextRequest, NextResponse } from "next/server";
import { resolveSessionClient, sessionIdErrorResponse } from "@/lib/providers/resolve-session";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId");
    const resolved = resolveSessionClient(sessionId);
    if (!resolved) return sessionIdErrorResponse();
    const result = await resolved.client.getQr();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load pairing code";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
