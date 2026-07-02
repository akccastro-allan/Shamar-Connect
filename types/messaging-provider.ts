export type MessagingProviderKind = "mock" | "whatsapp_web" | "meta_cloud_api" | "evolution_api";

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

export interface ProviderMediaPayload {
  mimetype?: string;
  data?: string;
  filename?: string;
  caption?: string;
}

export interface ProviderSyncedMessage {
  id: string;
  chatId: string;
  chatName?: string;
  isGroup?: boolean;
  from?: string;
  to?: string;
  body?: string;
  timestamp?: number;
  direction: "inbound" | "outbound";
  contactName?: string;
  phone?: string;
  type?: string;
  hasMedia?: boolean;
  media?: ProviderMediaPayload;
  mediaType?: string;
  mimeType?: string;
}

export interface MessagingProviderClient {
  getStatus(): Promise<ProviderStatus>;
  connect(): Promise<ProviderStatus>;
  getQr(): Promise<ProviderStatus>;
  sendMessage(payload: ProviderMessagePayload): Promise<{ id: string; status: "queued" | "sent" }>;
  listChats(): Promise<ProviderChatSummary[]>;
  listGroups(): Promise<ProviderGroupSummary[]>;
  listGroupParticipants(groupId: string): Promise<ProviderGroupParticipant[]>;
  listChatMessages(chatId: string, limit?: number): Promise<ProviderSyncedMessage[]>;
  logout(): Promise<ProviderStatus>;
}
