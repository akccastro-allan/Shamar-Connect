export type FeatureStage = "hidden" | "internal_alpha" | "private_beta" | "public_beta" | "stable";

export type CommercialStage =
  | "new"
  | "qualifying"
  | "qualified"
  | "offer_preparation"
  | "offer_sent"
  | "objection"
  | "negotiation"
  | "ready_to_close"
  | "follow_up"
  | "won"
  | "lost";

export type LeadTemperature = "cold" | "warm" | "hot";

export type CommercialAgentMode = "observer" | "copilot" | "assisted" | "approved_automation";

export type PricingAuthority = "catalog" | "table" | "proposal" | "human";
export type StockAuthority = "catalog" | "integration" | "human";

export type CommercialProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  qualifiers?: string[];
};

export type QualificationQuestion = {
  id: string;
  question: string;
  required: boolean;
  field: string;
};

export type ObjectionPlaybook = {
  id: string;
  objection: string;
  safeResponseGuidance: string;
  requiresHuman?: boolean;
};

export type CommercialAgentProfile = {
  id: string;
  tenantId: string;
  organizationId: string;
  enabled: boolean;
  stage: FeatureStage;
  businessName: string;
  positioning: string;
  targetAudience: string[];
  products: CommercialProduct[];
  qualificationQuestions: QualificationQuestion[];
  objections: ObjectionPlaybook[];
  allowedCallsToAction: string[];
  approvedClaims: string[];
  forbiddenClaims: string[];
  pricingAuthority: PricingAuthority;
  stockAuthority: StockAuthority;
  responseMode: CommercialAgentMode;
};

export type CommercialAnalysis = {
  intent: string;
  stage: CommercialStage;
  temperature: LeadTemperature;
  confidence: number;
  objections: string[];
  missingInformation: string[];
  recommendedNextAction: string;
  recommendedDepartment?: string;
  requiresHuman: boolean;
  riskFlags: string[];
  summary: string;
};

export type CommercialSuggestion = {
  text: string;
  callToAction?: string;
  requiresApproval: true;
  sources: Array<{
    type: "catalog" | "conversation" | "profile" | "rule";
    reference: string;
  }>;
  warnings: string[];
};

export type CommercialProviderMetadata = {
  provider: "openai" | "mock" | "deterministic";
  model: string;
  providerResponseId?: string | null;
  latencyMs: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  requestStatus: "success" | "feature_unavailable" | "timeout" | "rate_limited" | "provider_error" | "invalid_structured_output" | "guardrail_rejected";
};

export type CommercialSuggestionStatus = "draft" | "approved" | "edited" | "rejected" | "expired" | "unsafe_suggestion";

export type CommercialMessage = {
  id: string;
  direction: "inbound" | "outbound";
  body: string | null;
  messageType?: string | null;
  createdAt: string;
};

export type CommercialCatalogCandidate = {
  id: string;
  name: string;
  price?: number | null;
  stockQuantity?: number | null;
  confidence?: number | null;
  safeMatch?: boolean | null;
  reasons?: string[];
};

export type CommercialDeterministicClassification = {
  intent?: string | null;
  family?: string | null;
  vehicle?: string | null;
  year?: number | null;
  safeMatch?: CommercialCatalogCandidate | null;
  catalogCandidates?: CommercialCatalogCandidate[];
  price?: number | null;
  stockStatus?: "available" | "unavailable" | "unknown" | "confirm" | null;
  missingFields?: string[];
};

export type CommercialContext = {
  tenant: { id: string; name?: string | null; slug?: string | null; isPlatform?: boolean | null };
  organization: { id: string; name?: string | null; slug?: string | null };
  channel?: { id: string; provider?: string | null; sessionId?: string | null; displayName?: string | null } | null;
  conversation: { id: string; status?: string | null; stage?: string | null; priority?: string | null; isGroup?: boolean | null };
  contact?: { id?: string | null; name?: string | null; company?: string | null; tags?: string[] | null } | null;
  messages: CommercialMessage[];
  classification?: CommercialDeterministicClassification | null;
  assignment?: { userId?: string | null; departmentId?: string | null } | null;
  department?: { id: string; name: string } | null;
  currentStage?: CommercialStage | null;
  profile: CommercialAgentProfile;
};

export type CommercialAnalysisInput = {
  context: CommercialContext;
};

export type CommercialSuggestionInput = {
  context: CommercialContext;
  analysis?: CommercialAnalysis | null;
};

export type CommercialAgentProvider = {
  analyzeConversation(input: CommercialAnalysisInput): Promise<CommercialAnalysis>;
  suggestResponse(input: CommercialSuggestionInput): Promise<CommercialSuggestion>;
  getLastMetadata?(): CommercialProviderMetadata | null;
};

export type CommercialEvaluationEvent = {
  type: "analysis_generated" | "suggestion_generated" | "approved" | "edited" | "rejected" | "commercial_outcome";
  tenantId: string;
  organizationId: string;
  conversationId: string;
  suggestionId?: string;
  outcome?: string;
  rejectionReason?: string;
  shortReason?: string;
  createdAt: string;
};
