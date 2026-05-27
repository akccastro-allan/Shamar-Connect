import { NextResponse } from "next/server";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";

export async function GET() {
  try {
    const groups = await whatsappWebGatewayClient.listGroups();
    return NextResponse.json({ ok: true, groups });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load groups" }, { status: 500 });
  }
}
