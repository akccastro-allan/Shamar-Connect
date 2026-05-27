import { NextResponse } from "next/server";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";

export async function GET() {
  try {
    const status = await whatsappWebGatewayClient.getStatus();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load WhatsApp status" }, { status: 500 });
  }
}
