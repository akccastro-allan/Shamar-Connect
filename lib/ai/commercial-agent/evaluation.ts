import type { CommercialEvaluationEvent } from "./types.ts";

export function createEvaluationEvent(input: Omit<CommercialEvaluationEvent, "createdAt">): CommercialEvaluationEvent {
  return {
    ...input,
    shortReason: input.shortReason ? sanitizeShortReason(input.shortReason) : undefined,
    rejectionReason: input.rejectionReason ? sanitizeShortReason(input.rejectionReason) : undefined,
    createdAt: new Date().toISOString(),
  };
}

export function sanitizeShortReason(value: string) {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
}
