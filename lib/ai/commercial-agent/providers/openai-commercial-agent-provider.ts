import OpenAI from "openai";
import type {
  CommercialAgentProvider,
  CommercialAnalysis,
  CommercialAnalysisInput,
  CommercialProviderMetadata,
  CommercialSuggestion,
  CommercialSuggestionInput,
} from "../types.ts";
import { commercialAnalysisJsonSchema, commercialAnalysisSchema, commercialSuggestionJsonSchema, commercialSuggestionSchema } from "../schemas.ts";
import { buildSafetyIdentifier } from "../hash.ts";
import { buildLipsAnalysisPrompt } from "../prompts/lips-analysis-prompt.ts";
import { buildLipsSuggestionPrompt } from "../prompts/lips-suggestion-prompt.ts";

const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_OUTPUT_TOKENS = 900;

export type OpenAICommercialAgentProviderConfig = {
  apiKey?: string;
  model?: string;
  enabled?: boolean;
  tenantId: string;
  userId: string;
  timeoutMs?: number;
};

export class OpenAICommercialAgentProvider implements CommercialAgentProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly safetyIdentifier: string;
  private readonly timeoutMs: number;
  private lastMetadata: CommercialProviderMetadata | null = null;

  constructor(config: OpenAICommercialAgentProviderConfig) {
    if (!config.enabled) throw new Error("feature_unavailable");
    if (!config.apiKey) throw new Error("feature_unavailable");
    if (!config.model) throw new Error("feature_unavailable");

    this.client = new OpenAI({ apiKey: config.apiKey, timeout: config.timeoutMs ?? DEFAULT_TIMEOUT_MS });
    this.model = config.model;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.safetyIdentifier = buildSafetyIdentifier({ tenantId: config.tenantId, userId: config.userId });
  }

  getLastMetadata() {
    return this.lastMetadata;
  }

  async analyzeConversation(input: CommercialAnalysisInput): Promise<CommercialAnalysis> {
    const startedAt = Date.now();
    try {
      const response = await this.client.responses.create({
        model: this.model,
        input: buildLipsAnalysisPrompt(input.context),
        store: false,
        stream: false,
        tools: [],
        parallel_tool_calls: false,
        max_output_tokens: MAX_OUTPUT_TOKENS,
        safety_identifier: this.safetyIdentifier,
        text: {
          format: {
            type: "json_schema",
            name: "commercial_analysis",
            schema: commercialAnalysisJsonSchema,
            strict: true,
          },
        },
      });

      this.lastMetadata = metadataFromResponse(response, this.model, startedAt, "success");
      return commercialAnalysisSchema.parse(parseStructuredOutput(response.output_text));
    } catch (error) {
      this.lastMetadata = metadataFromError(error, this.model, startedAt);
      throw normalizeProviderError(error);
    }
  }

  async suggestResponse(input: CommercialSuggestionInput): Promise<CommercialSuggestion> {
    if (!input.analysis) throw new Error("analysis_required");

    const startedAt = Date.now();
    try {
      const response = await this.client.responses.create({
        model: this.model,
        input: buildLipsSuggestionPrompt(input.context, input.analysis),
        store: false,
        stream: false,
        tools: [],
        parallel_tool_calls: false,
        max_output_tokens: MAX_OUTPUT_TOKENS,
        safety_identifier: this.safetyIdentifier,
        text: {
          format: {
            type: "json_schema",
            name: "commercial_suggestion",
            schema: commercialSuggestionJsonSchema,
            strict: true,
          },
        },
      });

      this.lastMetadata = metadataFromResponse(response, this.model, startedAt, "success");
      return commercialSuggestionSchema.parse(parseStructuredOutput(response.output_text));
    } catch (error) {
      this.lastMetadata = metadataFromError(error, this.model, startedAt);
      throw normalizeProviderError(error);
    }
  }
}

export function createOpenAICommercialAgentProvider(config: Omit<OpenAICommercialAgentProviderConfig, "apiKey" | "model" | "enabled">) {
  return new OpenAICommercialAgentProvider({
    ...config,
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_COMMERCIAL_AGENT_MODEL,
    enabled: process.env.OPENAI_COMMERCIAL_AGENT_ENABLED === "true",
  });
}

function parseStructuredOutput(outputText: string | undefined) {
  if (!outputText) throw new Error("invalid_structured_output");
  try {
    return JSON.parse(outputText);
  } catch {
    throw new Error("invalid_structured_output");
  }
}

function metadataFromResponse(response: OpenAI.Responses.Response, model: string, startedAt: number, status: CommercialProviderMetadata["requestStatus"]): CommercialProviderMetadata {
  const usage = response.usage;
  return {
    provider: "openai",
    model,
    providerResponseId: response.id,
    latencyMs: Date.now() - startedAt,
    inputTokens: usage?.input_tokens ?? null,
    outputTokens: usage?.output_tokens ?? null,
    totalTokens: usage?.total_tokens ?? null,
    requestStatus: status,
  };
}

function metadataFromError(error: unknown, model: string, startedAt: number): CommercialProviderMetadata {
  return {
    provider: "openai",
    model,
    providerResponseId: null,
    latencyMs: Date.now() - startedAt,
    requestStatus: requestStatusFromError(error),
  };
}

function requestStatusFromError(error: unknown): CommercialProviderMetadata["requestStatus"] {
  if (error instanceof Error && error.message === "invalid_structured_output") return "invalid_structured_output";
  const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : 0;
  if (status === 429) return "rate_limited";
  if (error instanceof Error && /timeout/i.test(error.message)) return "timeout";
  return "provider_error";
}

function normalizeProviderError(error: unknown) {
  if (error instanceof Error && error.message === "invalid_structured_output") return error;
  const status = requestStatusFromError(error);
  return new Error(status);
}
