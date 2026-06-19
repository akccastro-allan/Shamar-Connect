import { ALLOWED_SESSION_IDS, createWhatsappGatewayClient, isAllowedSessionId, type AllowedSessionId } from "./whatsapp-web-gateway-client";
import { whatsappWebGatewayClient } from "./whatsapp-web-gateway-client";
import { NextResponse } from "next/server";

export const SESSION_LABELS: Record<AllowedSessionId, string> = {
  "hall-main": "Hall Donous",
  "lips-main": "Lips",
};

export function resolveSessionClient(sessionId?: string | null) {
  if (!sessionId) return { client: whatsappWebGatewayClient, sessionId: "hall-main" as AllowedSessionId };
  if (!isAllowedSessionId(sessionId)) return null;
  return { client: createWhatsappGatewayClient(sessionId), sessionId };
}

export function sessionIdErrorResponse() {
  return NextResponse.json(
    { ok: false, error: `sessionId inválido. Valores aceitos: ${ALLOWED_SESSION_IDS.join(", ")}` },
    { status: 400 },
  );
}
