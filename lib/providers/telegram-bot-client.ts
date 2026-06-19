/**
 * Telegram Bot API client — server-only.
 *
 * Env vars:
 *   TELEGRAM_BOT_TOKEN  — token from @BotFather
 *
 * Never expose the token to client components.
 */

const TELEGRAM_API_BASE = "https://api.telegram.org";

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

export function isTelegramConfigured(): boolean {
  return Boolean(getBotToken());
}

async function telegramFetch<T>(method: string, body?: Record<string, unknown>): Promise<T> {
  const token = getBotToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");

  const url = `${TELEGRAM_API_BASE}/bot${token}/${method}`;

  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const data = await response.json() as { ok: boolean; result?: T; description?: string };

  if (!data.ok) {
    throw new Error(`Telegram API error on ${method}: ${data.description || "unknown"}`);
  }

  return data.result as T;
}

export type TelegramBotInfo = {
  id: number;
  username: string;
  first_name: string;
  can_join_groups: boolean;
  can_read_all_group_messages: boolean;
};

export type TelegramSendResult = {
  message_id: number;
  chat: { id: number | string; type: string };
  date: number;
  text?: string;
};

/**
 * Get bot info — useful for diagnostics / confirming token works.
 */
export async function getMe(): Promise<TelegramBotInfo> {
  return telegramFetch<TelegramBotInfo>("getMe");
}

/**
 * Send a text message to a chat/channel/group.
 * chatId can be a numeric ID (e.g. -1001234567890) or a @username for public channels.
 * parse_mode defaults to "Markdown" so *bold* and _italic_ work in templates.
 */
export async function sendMessage(
  chatId: string | number,
  text: string,
  parseMode: "Markdown" | "HTML" | "MarkdownV2" | "" = "Markdown",
): Promise<TelegramSendResult> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
  };
  if (parseMode) body.parse_mode = parseMode;

  return telegramFetch<TelegramSendResult>("sendMessage", body);
}

/**
 * Pin a message in a group or channel (optional, bot must be admin).
 */
export async function pinChatMessage(
  chatId: string | number,
  messageId: number,
  disableNotification = false,
): Promise<boolean> {
  return telegramFetch<boolean>("pinChatMessage", {
    chat_id: chatId,
    message_id: messageId,
    disable_notification: disableNotification,
  });
}
