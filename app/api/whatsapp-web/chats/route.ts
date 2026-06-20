import { NextRequest, NextResponse } from "next/server";
import { resolveSessionClient, sessionIdErrorResponse } from "@/lib/providers/resolve-session";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId");
    const resolved = resolveSessionClient(sessionId);
    if (!resolved) return sessionIdErrorResponse();
    const chats = await resolved.client.listChats();
    return NextResponse.json({ ok: true, chats });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load WhatsApp chats" }, { status: 500 });
  }
}
