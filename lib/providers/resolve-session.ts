import { ALLOWED_SESSION_IDS, createWhatsappGatewayClient, isAllowedSessionId, type AllowedSessionId } from "./whatsapp-web-gateway-client";
import { whatsappWebGatewayClient } from "./whatsapp-web-gateway-client";
import { evolutionApiClient } from "./evolution-api-client";
import { NextResponse } from "next/server";

export const SESSION_LABELS: Record<AllowedSessionId, string> = {
  "hall-main": "Hall Donous",
  "lips-main": "Lips",
  "viciados-main": "Viciados em Trilhas",
  "mkshalom-main": "MK Shalom",
  "oriahfin-main": "Oriahfin",
  "shamar-main": "Shamar Connect",
  "shamarerp-main": "Shamar ERP",
  "shamarkids-main": "Shamar Kids",
};

export function resolveSessionClient(sessionId?: string | null) {
  if (!sessionId) {
    const defaultSessionId = process.env.WHATSAPP_WEB_GATEWAY_SESSION_ID || "hall-main";
    const resolvedSessionId = isAllowedSessionId(defaultSessionId) ? defaultSessionId : "hall-main";
    return { client: createWhatsappGatewayClient(resolvedSessionId), sessionId: resolvedSessionId };
  }
  if (!isAllowedSessionId(sessionId)) return null;

  // Todos usam WhatsApp Web (Evolution API está em preparação)
  return { client: createWhatsappGatewayClient(sessionId), sessionId };
}

export function sessionIdErrorResponse() {
  return NextResponse.json(
    { ok: false, error: `sessionId inválido. Valores aceitos: ${ALLOWED_SESSION_IDS.join(", ")}` },
    { status: 400 },
  );
}
