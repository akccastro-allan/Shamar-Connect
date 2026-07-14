export type CommercialModelCost = {
  model: string;
  currency: "USD";
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
  version: string;
};

export const COMMERCIAL_AGENT_MODEL_COSTS: CommercialModelCost[] = [
  {
    model: "gpt-4.1-mini",
    currency: "USD",
    inputPerMillionTokens: 0.4,
    outputPerMillionTokens: 1.6,
    version: "2026-07-13",
  },
];

export function estimateCommercialAgentCost(input: { model: string; inputTokens?: number | null; outputTokens?: number | null }) {
  const config = COMMERCIAL_AGENT_MODEL_COSTS.find((item) => item.model === input.model);
  if (!config) return null;

  const inputCost = ((input.inputTokens ?? 0) / 1_000_000) * config.inputPerMillionTokens;
  const outputCost = ((input.outputTokens ?? 0) / 1_000_000) * config.outputPerMillionTokens;
  return Number((inputCost + outputCost).toFixed(8));
}
