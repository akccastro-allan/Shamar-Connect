import { NextRequest, NextResponse } from "next/server";
import { resolveSessionClient, sessionIdErrorResponse } from "@/lib/providers/resolve-session";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId");
    const resolved = resolveSessionClient(sessionId);
    if (!resolved) return sessionIdErrorResponse();
    const groups = await resolved.client.listGroups();
    return NextResponse.json({ ok: true, groups });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load groups" }, { status: 500 });
  }
}
