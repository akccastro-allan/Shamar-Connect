import type { CommercialAnalysis, CommercialContext, CommercialSuggestion } from "./types.ts";
import { enforceDeterministicAuthority, validateCommercialSuggestion } from "./guardrails.ts";

export function suggestCommercialResponse(context: CommercialContext, analysis: CommercialAnalysis): CommercialSuggestion {
  const lines = buildSafeSuggestionLines(context, analysis);
  const baseSuggestion: CommercialSuggestion = {
    text: lines.join(" ").trim(),
    callToAction: chooseCallToAction(context, analysis),
    requiresApproval: true,
    sources: buildSources(context),
    warnings: [],
  };

  const authorityWarnings = enforceDeterministicAuthority(context, baseSuggestion.text);
  const guarded = validateCommercialSuggestion(context, { ...baseSuggestion, warnings: authorityWarnings });

  if (!guarded.safe || !guarded.suggestion) {
    return {
      text: "Sugestão bloqueada por regra comercial. Encaminhe para atendimento humano antes de responder.",
      requiresApproval: true,
      sources: [{ type: "rule", reference: "commercial_guardrails" }],
      warnings: guarded.warnings,
    };
  }

  return guarded.suggestion;
}

function buildSafeSuggestionLines(context: CommercialContext, analysis: CommercialAnalysis) {
  const missing = analysis.missingInformation;
  const lines: string[] = [];

  if (missing.length > 0) {
    lines.push(`Perfeito. Para te ajudar certinho, preciso confirmar: ${missing.join(", ")}.`);
  } else {
    lines.push("Perfeito, já tenho as principais informações para encaminhar seu atendimento.");
  }

  if (context.classification?.safeMatch?.name && context.classification?.price && context.classification.price > 0) {
    lines.push(`Encontrei uma opção no catálogo: ${context.classification.safeMatch.name}, valor R$ ${context.classification.price.toFixed(2).replace(".", ",")}.`);
    lines.push("Antes de fechar, um atendente confirma aplicação, disponibilidade e condição final.");
  } else if (context.classification?.catalogCandidates?.length) {
    lines.push("Encontrei possibilidades no catálogo, mas preciso de confirmação para evitar passar peça errada.");
  }

  if (analysis.recommendedDepartment === "Oficina") {
    lines.push("Pelo que você descreveu, pode ser um caso para a oficina avaliar.");
  }

  if (analysis.objections.includes("preço")) {
    lines.push("Entendi o ponto sobre valor. Vou deixar isso sinalizado para o atendente avaliar sem prometer condição antes da confirmação.");
  }

  if (analysis.requiresHuman) {
    lines.push("Vou encaminhar para um atendente confirmar os detalhes e te orientar com segurança.");
  }

  return lines;
}

function chooseCallToAction(context: CommercialContext, analysis: CommercialAnalysis) {
  if (analysis.missingInformation.length > 0) return "pedir dados faltantes";
  if (analysis.recommendedDepartment === "Oficina") return "encaminhar para oficina";
  if (context.profile.allowedCallsToAction.includes("encaminhar para balcão")) return "encaminhar para balcão";
  return "pedir confirmação humana";
}

function buildSources(context: CommercialContext): CommercialSuggestion["sources"] {
  const sources: CommercialSuggestion["sources"] = [
    { type: "profile", reference: context.profile.id },
    { type: "conversation", reference: context.conversation.id },
    { type: "rule", reference: "deterministic_authority" },
  ];

  if (context.classification?.safeMatch?.id) {
    sources.push({ type: "catalog", reference: context.classification.safeMatch.id });
  } else if (context.classification?.catalogCandidates?.length) {
    sources.push({ type: "catalog", reference: "catalog_candidates" });
  }

  return sources;
}
