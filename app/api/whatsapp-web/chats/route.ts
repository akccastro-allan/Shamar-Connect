import { NextResponse } from "next/server";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";

export async function GET() {
  try {
    const chats = await whatsappWebGatewayClient.listChats();
    return NextResponse.json({ ok: true, chats });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load WhatsApp chats" }, { status: 500 });
  }
}
