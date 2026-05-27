import { NextResponse } from "next/server";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";

export async function POST() {
  try {
    const result = await whatsappWebGatewayClient.connect();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gateway start failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
