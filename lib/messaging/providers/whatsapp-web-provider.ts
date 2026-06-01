import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";
import type { MessagingProviderAdapter, MessagingStatus, MessagingTextPayload } from "@/lib/messaging/types";

export const whatsappWebProvider: MessagingProviderAdapter = {
  key: "whatsapp_web",

  async getStatus(): Promise<MessagingStatus> {
    try {
      const status = await whatsappWebGatewayClient.getStatus();

      return {
        provider: "whatsapp_web",
        status: status.status || "idle",
        phone: status.phone || null,
        qrCode: status.qrCode,
        lastSyncAt: status.lastSyncAt,
        error: status.error,
        configured: Boolean(process.env.WHATSAPP_WEB_GATEWAY_URL),
      };
    } catch (error) {
      return {
        provider: "whatsapp_web",
        status: process.env.WHATSAPP_WEB_GATEWAY_URL ? "error" : "not_configured",
        phone: null,
        configured: Boolean(process.env.WHATSAPP_WEB_GATEWAY_URL),
        error: error instanceof Error ? error.message : "Erro ao consultar WhatsApp Web Gateway",
      };
    }
  },

  async sendTextMessage(payload: MessagingTextPayload) {
    const result = await whatsappWebGatewayClient.sendMessage({
      to: payload.to,
      body: payload.body,
      quotedMessageId: payload.quotedMessageId,
    });

    return {
      id: result.id,
      status: result.status,
      provider: "whatsapp_web" as const,
      raw: result,
    };
  },
};
