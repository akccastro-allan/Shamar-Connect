import { z } from "zod";

export const commercialStageValues = [
  "new",
  "qualifying",
  "qualified",
  "offer_preparation",
  "offer_sent",
  "objection",
  "negotiation",
  "ready_to_close",
  "follow_up",
  "won",
  "lost",
] as const;

export const leadTemperatureValues = ["cold", "warm", "hot"] as const;

export const commercialAnalysisSchema = z.object({
  intent: z.string().min(1).max(120),
  stage: z.enum(commercialStageValues),
  temperature: z.enum(leadTemperatureValues),
  confidence: z.number().min(0).max(1),
  objections: z.array(z.string().min(1).max(80)),
  missingInformation: z.array(z.string().min(1).max(80)),
  recommendedNextAction: z.string().min(1).max(240),
  recommendedDepartment: z.string().min(1).max(80).nullable().transform((value) => value ?? undefined),
  requiresHuman: z.boolean(),
  riskFlags: z.array(z.string().min(1).max(100)),
  summary: z.string().min(1).max(700),
});

export const commercialSuggestionSchema = z.object({
  text: z.string().min(1).max(1200),
  callToAction: z.string().min(1).max(120).nullable().transform((value) => value ?? undefined),
  requiresApproval: z.literal(true),
  sources: z.array(z.object({
    type: z.enum(["catalog", "conversation", "profile", "rule"]),
    reference: z.string().min(1).max(160),
  })),
  warnings: z.array(z.string().min(1).max(120)),
});

export const commercialAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "intent",
    "stage",
    "temperature",
    "confidence",
    "objections",
    "missingInformation",
    "recommendedNextAction",
    "recommendedDepartment",
    "requiresHuman",
    "riskFlags",
    "summary",
  ],
  properties: {
    intent: { type: "string" },
    stage: { type: "string", enum: commercialStageValues },
    temperature: { type: "string", enum: leadTemperatureValues },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    objections: { type: "array", items: { type: "string" } },
    missingInformation: { type: "array", items: { type: "string" } },
    recommendedNextAction: { type: "string" },
    recommendedDepartment: { type: ["string", "null"] },
    requiresHuman: { type: "boolean" },
    riskFlags: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
  },
} as const;

export const commercialSuggestionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["text", "callToAction", "requiresApproval", "sources", "warnings"],
  properties: {
    text: { type: "string" },
    callToAction: { type: ["string", "null"] },
    requiresApproval: { type: "boolean", const: true },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "reference"],
        properties: {
          type: { type: "string", enum: ["catalog", "conversation", "profile", "rule"] },
          reference: { type: "string" },
        },
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
} as const;
