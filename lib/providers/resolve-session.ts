import { ALLOWED_SESSION_IDS, createWhatsappGatewayClient, isAllowedSessionId } from "./whatsapp-web-gateway-client";
import { whatsappWebGatewayClient } from "./whatsapp-web-gateway-client";
import { evolutionApiClient } from "./evolution-api-client";
import { NextResponse } from "next/server";

const SESSION_BASE_LABELS: Record<string, string> = {
  hall: "Hall Donous",
  lips: "Lips",
  viciados: "Viciados em Trilhas",
  mkshalom: "MK Shalom",
  oriahfin: "Oriahfin",
  shamar: "Shamar Connect",
  shamarerp: "Shamar ERP",
  shamarkids: "Shamar Kids",
};

function getSessionLabel(sessionId: string) {
  const numbered = sessionId.match(/^(.+)-(0[1-9])$/);
  if (numbered) {
    const [, prefix, suffix] = numbered;
    return `${SESSION_BASE_LABELS[prefix] || prefix} ${suffix}`;
  }

  return SESSION_BASE_LABELS[sessionId.replace(/-main$/, "")] || sessionId;
}

export const SESSION_LABELS: Record<string, string> = Object.fromEntries(
  ALLOWED_SESSION_IDS.map((sessionId) => [sessionId, getSessionLabel(sessionId)]),
);

Object.assign(SESSION_LABELS, {
  "hall-main": "Hall Donous",
  "lips-main": "Lips",
  "viciados-main": "Viciados em Trilhas",
  "mkshalom-main": "MK Shalom",
  "oriahfin-main": "Oriahfin",
  "shamar-main": "Shamar Connect",
  "shamarerp-main": "Shamar ERP",
  "shamarkids-main": "Shamar Kids",
});

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
