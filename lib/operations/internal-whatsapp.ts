import { isValidSessionId } from "../providers/session-id.ts";
import type { InternalGatewayRow } from "./internal-gateways.ts";
import { getChannelGatewayId, validateGatewayCanConnect, type InternalChannelGatewayRow } from "./internal-gateways.ts";

export type InternalWhatsappChannel = InternalChannelGatewayRow & {
  provider: string | null;
  channel_type: string | null;
  tenant_id: string;
  organization_id: string;
  is_group?: boolean | null;
};

export type InternalWhatsappConversation = {
  id: string;
  tenant_id: string;
  organization_id: string;
  channel_id: string | null;
  external_chat_id: string | null;
  is_group: boolean | null;
};

const INTERNAL_LEGACY_SESSION_IDS = new Set([
  "viciados-main",
  "mkshalom-main",
  "oriahfin-main",
  "shamar-main",
  "shamarerp-main",
  "shamarkids-main",
]);

function isAllowedInternalSessionId(value: string) {
  return isValidSessionId(value) || INTERNAL_LEGACY_SESSION_IDS.has(value);
}

export function isInternalWhatsappChannel(channel: Pick<InternalWhatsappChannel, "provider" | "channel_type" | "metadata"> | null) {
  if (!channel) return false;
  const metadata = channel.metadata && typeof channel.metadata === "object" && !Array.isArray(channel.metadata)
    ? channel.metadata as Record<string, unknown>
    : {};
  return metadata.commandCenterInternal === true && (channel.provider === "openwa" || channel.provider === "whatsapp_web") && channel.channel_type === "whatsapp_web";
}

export function validateInternalChannelForGatewayAction(input: {
  channel: InternalWhatsappChannel | null;
  gateway: InternalGatewayRow | null;
  tenantId: string;
  organizationId?: string | null;
}) {
  if (!input.channel) return { ok: false as const, error: "Canal interno não encontrado." };
  if (input.channel.tenant_id !== input.tenantId) return { ok: false as const, error: "Canal não pertence ao tenant atual." };
  if (input.organizationId && input.channel.organization_id !== input.organizationId) return { ok: false as const, error: "Canal não pertence à organização atual." };
  if (!isInternalWhatsappChannel(input.channel)) return { ok: false as const, error: "Canal não é WhatsApp interno." };
  if (!input.channel.session_id || !isAllowedInternalSessionId(input.channel.session_id)) return { ok: false as const, error: "Canal interno sem session ID válido." };
  if (!getChannelGatewayId(input.channel)) return { ok: false as const, error: "Canal interno sem gateway." };
  const gateway = validateGatewayCanConnect(input.gateway, input.tenantId);
  if (!gateway.ok) return gateway;
  if (getChannelGatewayId(input.channel) !== input.gateway?.id) return { ok: false as const, error: "Gateway não corresponde ao canal." };
  return { ok: true as const };
}

export function validateInternalManualReply(input: {
  conversation: InternalWhatsappConversation | null;
  channel: InternalWhatsappChannel | null;
  gateway: InternalGatewayRow | null;
  tenantId: string;
}) {
  if (!input.conversation) return { ok: false as const, error: "Conversa não encontrada." };
  if (input.conversation.tenant_id !== input.tenantId) return { ok: false as const, error: "Conversa não pertence ao tenant atual." };
  if (!input.conversation.channel_id) return { ok: false as const, error: "Conversa sem canal de origem." };
  if (input.conversation.channel_id !== input.channel?.id) return { ok: false as const, error: "Canal da conversa não corresponde ao canal de envio." };
  if (input.conversation.is_group || input.conversation.external_chat_id?.endsWith("@g.us")) return { ok: false as const, error: "Envio para grupos internos continua desativado." };
  const channel = validateInternalChannelForGatewayAction({ channel: input.channel, gateway: input.gateway, tenantId: input.tenantId });
  if (!channel.ok) return channel;
  if (input.channel?.status !== "connected") return { ok: false as const, error: "Sessão interna não está conectada." };
  return { ok: true as const };
}

export function buildInternalConversationOrigin(input: {
  businessLabel: string;
  channelId: string;
  sessionId: string;
  gatewayId: string;
  purpose: string;
}) {
  return {
    empresa: input.businessLabel,
    canal: input.channelId,
    conta: input.sessionId,
    session_id: input.sessionId,
    gateway: input.gatewayId,
    finalidade: input.purpose,
  };
}
