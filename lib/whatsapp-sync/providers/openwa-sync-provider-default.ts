import { createWhatsappGatewayClient, isAllowedSessionId } from "../../providers/whatsapp-web-gateway-client";
import { resolveSessionClient } from "../../providers/resolve-session";
import { createOpenWaSyncProvider } from "./openwa-sync-provider";

type GatewayOptions = { baseUrl?: string | null };

export function createDefaultOpenWaSyncProvider(sessionId: string, options?: GatewayOptions) {
  if (options?.baseUrl) {
    if (!isAllowedSessionId(sessionId)) throw new Error("session_id invalido para WhatsApp Web.");
    return createOpenWaSyncProvider(sessionId, (resolvedSessionId) => {
      if (!isAllowedSessionId(resolvedSessionId)) return null;
      return {
        sessionId: resolvedSessionId,
        client: createWhatsappGatewayClient(resolvedSessionId, options),
      };
    });
  }

  return createOpenWaSyncProvider(sessionId, resolveSessionClient);
}
