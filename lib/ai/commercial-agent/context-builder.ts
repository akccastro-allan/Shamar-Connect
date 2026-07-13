import type { CommercialContext, CommercialMessage } from "./types.ts";

const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 600;
const MAX_TOTAL_CHARS = 8_000;
const SECRET_PATTERN = /(service[_-]?role|bearer\s+[a-z0-9._-]+|api[_-]?key|access[_-]?token|refresh[_-]?token|secret|cookie)/gi;
const PHONE_PATTERN = /(?<!\d)(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}(?!\d)/g;

export type BuildCommercialContextInput = Omit<CommercialContext, "messages"> & {
  messages: CommercialMessage[];
};

export function buildCommercialContext(input: BuildCommercialContextInput): CommercialContext {
  assertSameScope(input);

  const messages = limitMessages(input.messages);

  return {
    ...input,
    contact: input.contact ? redactContact(input.contact) : input.contact,
    messages,
  };
}

export function redactOperationalText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(SECRET_PATTERN, "[redacted]")
    .replace(PHONE_PATTERN, "[phone-redacted]")
    .slice(0, MAX_MESSAGE_CHARS);
}

function limitMessages(messages: CommercialMessage[]) {
  const recent = messages.slice(-MAX_MESSAGES);
  const output: CommercialMessage[] = [];
  let totalChars = 0;

  for (const message of recent) {
    const body = redactOperationalText(message.body);
    if (totalChars + body.length > MAX_TOTAL_CHARS) break;
    totalChars += body.length;
    output.push({ ...message, body });
  }

  return output;
}

function redactContact(contact: NonNullable<CommercialContext["contact"]>) {
  return {
    ...contact,
    name: contact.name ? redactOperationalText(contact.name) : contact.name,
    company: contact.company ? redactOperationalText(contact.company) : contact.company,
  };
}

function assertSameScope(input: BuildCommercialContextInput) {
  if (!input.tenant.id || !input.organization.id) {
    throw new Error("commercial_context_scope_required");
  }

  if (input.profile.tenantId !== input.tenant.id || input.profile.organizationId !== input.organization.id) {
    throw new Error("commercial_context_profile_scope_mismatch");
  }
}

export const COMMERCIAL_CONTEXT_LIMITS = {
  maxMessages: MAX_MESSAGES,
  maxMessageChars: MAX_MESSAGE_CHARS,
  maxTotalChars: MAX_TOTAL_CHARS,
};
