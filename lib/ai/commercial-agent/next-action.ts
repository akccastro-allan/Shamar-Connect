import type { CommercialAnalysis, CommercialContext } from "./types.ts";

export type CommercialFollowUpDraft = {
  reason: string;
  suggestedAt: string;
  priority: "low" | "normal" | "high";
  status: "pending";
};

export function buildFollowUpDraft(context: CommercialContext, analysis: CommercialAnalysis): CommercialFollowUpDraft {
  const hours = analysis.temperature === "hot" ? 2 : analysis.temperature === "warm" ? 24 : 72;
  const suggestedAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  return {
    reason: analysis.recommendedNextAction || `Acompanhar oportunidade ${context.conversation.id}`,
    suggestedAt,
    priority: analysis.temperature === "hot" ? "high" : analysis.temperature === "warm" ? "normal" : "low",
    status: "pending",
  };
}

export function observerModeBlocksSending(context: CommercialContext) {
  return context.profile.responseMode === "observer";
}
