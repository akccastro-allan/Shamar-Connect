/**
 * Tipos para o agente de automação Lips
 */

export interface IntentDetectionResult {
  intent: 'parts' | 'stock' | 'quote' | 'generic' | 'support' | 'unknown';
  confidence: number; // 0.0 to 1.0
  extracted: {
    productName?: string;
    vehicleBrand?: string;
    vehicleModel?: string;
    vehicleYear?: number;
    quantity?: number;
    otherKeywords?: string[];
  };
  reasoning?: string;
}

export interface CatalogMatch {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number; // Nunca null
  stock_quantity: number;
  brand?: string;
  category?: string;
  vehicleModels?: string[];
  confidence: number; // 0.0 to 1.0
  matchType: 'exact' | 'synonym' | 'partial' | 'fuzzy';
}

export interface AutoResponse {
  text: string;
  type: 'found' | 'needs_more_info' | 'not_found';
  selectedItem?: CatalogMatch;
  metadata: {
    catalogItemId?: string;
    confidence: number;
    responseTime?: number; // ms
  };
}

export interface AutomationJobResult {
  jobId: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  intent?: IntentDetectionResult;
  catalogMatches?: CatalogMatch[];
  selectedCatalogItem?: CatalogMatch;
  response?: AutoResponse;
  sentToEvolution: boolean;
  evolutionMessageId?: string;
  outboundMessageId?: string;
  error?: {
    message: string;
    code?: string;
    context?: Record<string, unknown>;
  };
}

export interface ProcessMessageInput {
  messageId: string;
  conversationId: string;
  channelId: string;
  body: string;
  senderId: string;
  senderName?: string;
  timestamp: number;
}
