import type { ProviderChatSummary, ProviderConnectionStatus, ProviderSyncedMessage } from "../../../types/messaging-provider.ts";

type SessionResolver = (sessionId: string) => {
  sessionId: string;
  client: {
    getStatus(): Promise<{ status: ProviderConnectionStatus }>;
    listChats(): Promise<ProviderChatSummary[]>;
    listChatMessages(chatId: string, limit: number): Promise<ProviderSyncedMessage[]>;
  };
} | null;

export type OpenWaSyncProvider = {
  sessionId: string;
  getConnectionStatus(): Promise<ProviderConnectionStatus>;
  listChats(): Promise<ProviderChatSummary[]>;
  listChatMessages(chatId: string, limit: number): Promise<ProviderSyncedMessage[]>;
};

export function createOpenWaSyncProvider(sessionId: string, resolver: SessionResolver): OpenWaSyncProvider {
  const resolved = resolver(sessionId);
  if (!resolved) throw new Error("session_id invalido para WhatsApp Web.");

  return {
    sessionId: resolved.sessionId,
    async getConnectionStatus() {
      const status = await resolved.client.getStatus();
      return status.status;
    },
    listChats() {
      return resolved.client.listChats();
    },
    listChatMessages(chatId: string, limit: number) {
      return resolved.client.listChatMessages(chatId, limit);
    },
  };
}

export function isOpenWaConnected(status: ProviderConnectionStatus | string | null | undefined) {
  return status === "ready" || status === "authenticated";
}
