import { NextRequest, NextResponse } from "next/server";
import { isUnauthorizedError } from "@/lib/auth/app-context";
import { requireOwnedWhatsappSession } from "../_auth";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId");
    const session = await requireOwnedWhatsappSession(sessionId);
    if (!session.ok) return session.response;

    const chats = await session.resolved.client.listChats();
    return NextResponse.json({ ok: true, chats });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load WhatsApp chats" }, { status: 500 });
  }
}
