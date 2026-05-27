import { NextRequest, NextResponse } from "next/server";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";

type Params = { params: Promise<{ chatId: string }> };

export async function GET(request: NextRequest, context: Params) {
  try {
    const { chatId } = await context.params;
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);

    if (!chatId) {
      return NextResponse.json({ ok: false, error: "chatId is required" }, { status: 400 });
    }

    const messages = await whatsappWebGatewayClient.listChatMessages(chatId, limit);
    return NextResponse.json({ ok: true, chatId, messages });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load chat messages" }, { status: 500 });
  }
}
