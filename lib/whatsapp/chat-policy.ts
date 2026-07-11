export function isWhatsappGroupChat(chatId: string, isGroupFlag = false) {
  return isGroupFlag || chatId.trim().toLowerCase().endsWith("@g.us");
}
