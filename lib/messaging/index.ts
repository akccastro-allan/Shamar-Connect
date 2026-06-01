import { metaWhatsappProvider } from "@/lib/messaging/providers/meta-whatsapp-provider";
import { whatsappWebProvider } from "@/lib/messaging/providers/whatsapp-web-provider";
import type { MessagingProviderAdapter, MessagingProviderKey } from "@/lib/messaging/types";

const providers: Record<string, MessagingProviderAdapter> = {
  whatsapp_web: whatsappWebProvider,
  meta_whatsapp: metaWhatsappProvider,
  meta_cloud_api: metaWhatsappProvider,
};

export function getActiveMessagingProviderKey(): MessagingProviderKey {
  const value = process.env.NEXT_PUBLIC_ACTIVE_MESSAGING_PROVIDER || "whatsapp_web";

  if (value === "meta_cloud_api") return "meta_cloud_api";
  if (value === "meta_whatsapp") return "meta_whatsapp";
  if (value === "whatsapp_web") return "whatsapp_web";

  return "whatsapp_web";
}

export function getMessagingProvider(providerKey: MessagingProviderKey = getActiveMessagingProviderKey()): MessagingProviderAdapter {
  return providers[providerKey] || whatsappWebProvider;
}

export async function getMessagingProvidersStatus() {
  const statuses = await Promise.allSettled([
    whatsappWebProvider.getStatus(),
    metaWhatsappProvider.getStatus(),
  ]);

  return statuses.map((result, index) => {
    const provider = index === 0 ? "whatsapp_web" : "meta_whatsapp";

    if (result.status === "fulfilled") return result.value;

    return {
      provider,
      status: "error" as const,
      configured: false,
      phone: null,
      error: result.reason instanceof Error ? result.reason.message : "Erro ao consultar provider",
    };
  });
}

export type { MessagingProviderAdapter, MessagingProviderKey, MessagingStatus, MessagingTextPayload, MessagingSendResult, NormalizedIncomingMessage } from "@/lib/messaging/types";
