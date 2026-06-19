export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return digits;
  // Already has Brazil country code and full number (12-13 digits)
  if (digits.startsWith("55") && digits.length >= 12 && digits.length <= 13) return digits;
  // DDD + number (10-11 digits) — prepend Brazil code
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
}

export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // 55 + DDD(2) + 9digit = 13 digits
  if (digits.startsWith("55") && digits.length === 13) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  // 55 + DDD(2) + 8digit = 12 digits
  if (digits.startsWith("55") && digits.length === 12) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  // DDD + 9digit = 11 digits
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  // DDD + 8digit = 10 digits
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

// Extract a dialable phone number from a WhatsApp chat ID like "5521999999999@c.us"
export function phoneFromChatId(chatId: string): string {
  return chatId.replace(/@.*$/, "").replace(/\D/g, "");
}
