export type MessagingProviderKind = "mock" | "whatsapp_web" | "meta_cloud_api";

export type ProviderConnectionStatus = "idle" | "connecting" | "qr" | "authenticated" | "ready" | "disconnected" | "error";

export interface ProviderStatus {
  provider: MessagingProviderKind;
  status: ProviderConnectionStatus;
  phone?: string;
  qrCode?: string;
  pairingCode?: string;
  lastSyncAt?: string;
  error?: string;
}

export interface ProviderMessagePayload {
  to: string;
  body: string;
  quotedMessageId?: string;
}

export interface ProviderChatSummary {
  id: string;
  name: string;
  isGroup: boolean;
  unreadCount?: number;
  lastMessageAt?: string;
}

export interface ProviderGroupSummary {
  id: string;
  name: string;
  participantCount?: number;
}

export interface ProviderGroupParticipant {
  id: string;
  name?: string;
  phone: string;
  isAdmin?: boolean;
  sourceGroupId: string;
  sourceGroupName: string;
}

export interface MessagingProviderClient {
  getStatus(): Promise<ProviderStatus>;
  connect(): Promise<ProviderStatus>;
  getQr(): Promise<ProviderStatus>;
  sendMessage(payload: ProviderMessagePayload): Promise<{ id: string; status: "queued" | "sent" }>;
  listChats(): Promise<ProviderChatSummary[]>;
  listGroups(): Promise<ProviderGroupSummary[]>;
  listGroupParticipants(groupId: string): Promise<ProviderGroupParticipant[]>;
  logout(): Promise<ProviderStatus>;
}
