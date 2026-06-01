export type MessagingProviderKey = "mock" | "whatsapp_web" | "meta_whatsapp" | "meta_cloud_api";

export type MessagingConnectionStatus = "idle" | "connecting" | "qr" | "authenticated" | "ready" | "disconnected" | "not_configured" | "error";

export type MessagingSendResult = {
  id: string;
  status: "queued" | "sent" | "failed";
  provider: MessagingProviderKey;
  raw?: unknown;
};

export type MessagingStatus = {
  provider: MessagingProviderKey;
  status: MessagingConnectionStatus;
  phone?: string | null;
  phoneNumberId?: string | null;
  businessAccountId?: string | null;
  qrCode?: string;
  lastSyncAt?: string;
  error?: string;
  configured: boolean;
};

export type MessagingTextPayload = {
  to: string;
  body: string;
  quotedMessageId?: string;
  metadata?: Record<string, unknown>;
};

export type NormalizedIncomingMessage = {
  provider: MessagingProviderKey;
  externalMessageId: string;
  externalChatId: string;
  from: string;
  to?: string;
  body?: string;
  messageType: string;
  timestamp?: number;
  raw: unknown;
};

export interface MessagingProviderAdapter {
  key: MessagingProviderKey;
  getStatus(): Promise<MessagingStatus>;
  sendTextMessage(payload: MessagingTextPayload): Promise<MessagingSendResult>;
  normalizeIncomingMessage?(payload: unknown): NormalizedIncomingMessage[];
}
