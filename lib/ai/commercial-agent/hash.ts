import { createHash } from "node:crypto";
import type { CommercialContext } from "./types.ts";

export function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function buildConversationContentHash(context: CommercialContext) {
  return sha256Hex(JSON.stringify({
    conversationId: context.conversation.id,
    messages: context.messages.map((message) => ({
      id: message.id,
      direction: message.direction,
      body: message.body,
      createdAt: message.createdAt,
    })),
    classification: context.classification ?? null,
  }));
}

export function buildSafetyIdentifier(input: { tenantId: string; userId: string }) {
  return sha256Hex(`${input.tenantId}:${input.userId}`).slice(0, 64);
}
