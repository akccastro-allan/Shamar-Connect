import { NextResponse } from "next/server";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";

export async function GET() {
  try {
    const result = await whatsappWebGatewayClient.getQr();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load pairing code";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
