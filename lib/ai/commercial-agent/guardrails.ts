import type { CommercialContext, CommercialSuggestion } from "./types.ts";

const UNSAFE_PATTERNS: Array<{ flag: string; pattern: RegExp }> = [
  { flag: "invented_or_modified_price", pattern: /\b(r\$|por\s+\d+[,.]?\d*|fica\s+\d+[,.]?\d*)/i },
  { flag: "stock_guarantee", pattern: /\b(garantido|garanto|temos em estoque|estoque confirmado|pode retirar)\b/i },
  { flag: "application_guarantee", pattern: /\b(serve sim|aplica sim|compat[ií]vel com certeza|d[aá] certo)\b/i },
  { flag: "discount_promise", pattern: /\b(desconto|consigo fazer|melhorar o valor|baixar o preço)\b/i },
  { flag: "pix_or_payment", pattern: /\b(pix|chave|pagamento confirmado|pagar agora)\b/i },
  { flag: "reservation_confirmation", pattern: /\b(reservado|separei|separado|reserva confirmada)\b/i },
  { flag: "pickup_confirmation", pattern: /\b(retirada confirmada|pode retirar|passa aqui)\b/i },
  { flag: "schedule_confirmation", pattern: /\b(agendado|agenda confirmada|hor[aá]rio confirmado)\b/i },
  { flag: "automatic_close", pattern: /\b(venda fechada|pedido fechado|finalizamos a compra)\b/i },
];

export type GuardrailResult = {
  safe: boolean;
  status: "safe" | "unsafe_suggestion";
  warnings: string[];
  suggestion: CommercialSuggestion | null;
};

export function validateCommercialSuggestion(context: CommercialContext, suggestion: CommercialSuggestion): GuardrailResult {
  const warnings = new Set(suggestion.warnings);
  const unsafeFlags = new Set<string>();

  for (const item of UNSAFE_PATTERNS) {
    if (!item.pattern.test(suggestion.text)) continue;

    if (item.flag === "invented_or_modified_price" && isAllowedCatalogPrice(context, suggestion.text)) continue;

    warnings.add(item.flag);
    unsafeFlags.add(item.flag);
  }

  if (context.profile.responseMode === "observer") warnings.add("observer_mode_no_send");
  if (suggestion.requiresApproval !== true) {
    warnings.add("approval_required");
    unsafeFlags.add("approval_required");
  }

  if (unsafeFlags.size > 0) {
    return { safe: false, status: "unsafe_suggestion", warnings: Array.from(warnings), suggestion: null };
  }

  return { safe: true, status: "safe", warnings: Array.from(warnings), suggestion: { ...suggestion, warnings: Array.from(warnings) } };
}

export function enforceDeterministicAuthority(context: CommercialContext, text: string) {
  const warnings: string[] = [];
  const price = context.classification?.price;
  const safeMatch = context.classification?.safeMatch;

  if (/\b(r\$|por\s+\d+[,.]?\d*)/i.test(text) && !price) warnings.push("price_without_catalog_authority");
  if (/\b(serve|aplica|compat[ií]vel|d[aá] certo)\b/i.test(text) && !safeMatch) warnings.push("application_without_safe_match");
  if (/\b(estoque confirmado|temos em estoque|dispon[ií]vel)\b/i.test(text) && context.classification?.stockStatus !== "available") {
    warnings.push("stock_without_catalog_authority");
  }

  return warnings;
}

function isAllowedCatalogPrice(context: CommercialContext, text: string) {
  const price = context.classification?.price ?? context.classification?.safeMatch?.price;
  if (!price || price <= 0) return false;
  const normalizedPrice = String(price.toFixed(2)).replace(".", ",");
  return text.includes(normalizedPrice) || text.includes(String(price));
}
