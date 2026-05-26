export type CrmStage = "new" | "qualified" | "proposal" | "won" | "lost";

export type LeadSource = "whatsapp" | "instagram" | "site" | "manual" | "meta_ads";

export type LeadIntent = "support" | "quote" | "catalog" | "payment" | "follow_up" | "unknown";

export interface CrmContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  source: LeadSource;
  tags: string[];
  consentForMarketing: boolean;
  createdAt: string;
}

export interface CrmOpportunity {
  id: string;
  contactId: string;
  stage: CrmStage;
  title: string;
  value: number;
  probability: number;
  ownerId?: string;
  nextActionAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrmConversationEvent {
  id: string;
  provider: "mock" | "whatsapp_web" | "meta_cloud_api";
  externalMessageId?: string;
  contactPhone: string;
  direction: "inbound" | "outbound";
  body: string;
  intent: LeadIntent;
  stageHint?: CrmStage;
  createdAt: string;
}

export interface LeadScoreResult {
  score: number;
  intent: LeadIntent;
  recommendedStage: CrmStage;
  recommendedAction: string;
  reasons: string[];
}
