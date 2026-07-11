import { NextRequest, NextResponse } from "next/server";
import { isUnauthorizedError } from "@/lib/auth/app-context";
import { requireOwnedWhatsappSession } from "../../../_auth";

type Params = { params: Promise<{ chatId: string }> };

export async function GET(request: NextRequest, context: Params) {
  try {
    const { chatId } = await context.params;
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
    const sessionId = url.searchParams.get("sessionId");

    if (!chatId) {
      return NextResponse.json({ ok: false, error: "chatId is required" }, { status: 400 });
    }

    const session = await requireOwnedWhatsappSession(sessionId);
    if (!session.ok) return session.response;

    const messages = await session.resolved.client.listChatMessages(chatId, limit);
    return NextResponse.json({ ok: true, chatId, messages });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load chat messages" }, { status: 500 });
  }
}
