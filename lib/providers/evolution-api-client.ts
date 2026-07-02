/**
 * Evolution API client — para Lips e outras unidades que usam Evolution
 * Documentação: https://evolution-api.docs.apiary.io/
 */

import type { MessagingProviderClient, ProviderMessagePayload, ProviderStatus } from "@/types/messaging-provider";

function getEvolutionBaseUrl() {
  const url = process.env.EVOLUTION_API_URL?.replace(/\/$/, "") || "";
  return url;
}

function getEvolutionApiKey() {
  return process.env.EVOLUTION_API_KEY || "";
}

function getEvolutionInstanceId() {
  return process.env.EVOLUTION_INSTANCE_ID || "";
}

async function evolutionFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getEvolutionBaseUrl();
  const apiKey = getEvolutionApiKey();
  const instanceId = getEvolutionInstanceId();

  if (!baseUrl || !apiKey || !instanceId) {
    throw new Error(
      "Evolution API not configured. Required: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_ID",
    );
  }

  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      apikey: apiKey,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (response.ok) {
    return response.json() as Promise<T>;
  }

  const errorBody = await response.text();
  throw new Error(`Evolution API error ${response.status}: ${errorBody}`);
}

export const evolutionApiClient: MessagingProviderClient = {
  async getStatus() {
    const instanceId = getEvolutionInstanceId();
    const { data } = await evolutionFetch<{ data: ProviderStatus }>(`/instance/get/${instanceId}`);
    return data;
  },

  async connect() {
    const instanceId = getEvolutionInstanceId();
    const { data } = await evolutionFetch<{ data: ProviderStatus }>(`/instance/connect/${instanceId}`, {
      method: "POST",
    });
    return data;
  },

  async getQr() {
    const instanceId = getEvolutionInstanceId();
    const { data } = await evolutionFetch<{ data: ProviderStatus }>(`/instance/fetchQrCode/${instanceId}`);
    return data;
  },

  async sendMessage(payload: ProviderMessagePayload) {
    const instanceId = getEvolutionInstanceId();

    // Evolution API espera: { number, text, delay? }
    const evolutionPayload = {
      number: payload.to,
      text: payload.body,
      delay: 1000,
    };

    const response = await evolutionFetch<{ key: { id: string } }>(`/message/sendText/${instanceId}`, {
      method: "POST",
      body: JSON.stringify(evolutionPayload),
    });

    return {
      id: response.key.id,
      status: "sent" as const,
    };
  },

  async listChats() {
    const instanceId = getEvolutionInstanceId();
    const { data } = await evolutionFetch<{ data: any[] }>(`/chat/findChats/${instanceId}`);
    return (
      data?.map((chat: any) => ({
        id: chat.id,
        name: chat.name,
        isGroup: chat.isGroup,
        unreadCount: chat.unreadCount,
      })) || []
    );
  },

  async listGroups() {
    const instanceId = getEvolutionInstanceId();
    const { data } = await evolutionFetch<{ data: any[] }>(`/chat/findChats/${instanceId}?isGroup=true`);
    return (
      data?.map((group: any) => ({
        id: group.id,
        name: group.name,
        isGroup: true,
      })) || []
    );
  },

  async listGroupParticipants(groupId: string) {
    const instanceId = getEvolutionInstanceId();
    const response = await evolutionFetch<{ data: any }>(
      `/chat/findGroup/${instanceId}?groupJid=${encodeURIComponent(groupId)}`,
    );
    const participants = response?.data?.participants || [];
    return participants.map((p: any) => ({
      id: p.id,
      name: p.name,
      isAdmin: p.isAdmin,
    }));
  },

  async listChatMessages(chatId: string, limit = 50) {
    const instanceId = getEvolutionInstanceId();
    const { data } = await evolutionFetch<{ data: any[] }>(
      `/message/findMessages/${instanceId}?chatId=${encodeURIComponent(chatId)}&limit=${limit}`,
    );
    return (
      data?.map((msg: any) => ({
        id: msg.key.id,
        body: msg.message?.conversation,
        timestamp: msg.messageTimestamp,
        fromMe: msg.key.fromMe,
        chatId,
        direction: msg.key.fromMe ? "outbound" : "inbound",
      })) || []
    );
  },

  async logout() {
    const instanceId = getEvolutionInstanceId();
    await evolutionFetch<void>(`/instance/logout/${instanceId}`, { method: "POST" });
    return { status: "disconnected", provider: "evolution_api" };
  },
};
