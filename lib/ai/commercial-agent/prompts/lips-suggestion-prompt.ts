import type { CommercialAnalysis, CommercialContext } from "../types.ts";

export const LIPS_SUGGESTION_PROMPT_VERSION = "lips-suggestion-v1";

export function buildLipsSuggestionPrompt(context: CommercialContext, analysis: CommercialAnalysis) {
  return [
    section("instruções permanentes", [
      "Você é um copiloto comercial supervisionado da Lips.",
      "Gere uma sugestão útil para o atendente humano revisar, nunca para envio automático.",
      "A sugestão deve exigir aprovação e indicar fontes.",
      "Responda somente no schema JSON solicitado.",
    ]),
    section("perfil da Lips", [
      `Negócio: ${context.profile.businessName}`,
      context.profile.positioning,
      "Tom: direto, consultivo, seguro e sem promessas indevidas.",
    ]),
    section("regras comerciais", [
      "Não inventar preço, estoque, prazo, marca, produto ou aplicação.",
      "Não prometer desconto, PIX, reserva, retirada, agenda ou venda fechada.",
      "Se faltar dado, peça o dado faltante.",
      "Se houver risco, encaminhe para humano.",
    ]),
    section("dados determinísticos", [JSON.stringify(context.classification ?? {}, null, 2)]),
    section("análise", [JSON.stringify(analysis, null, 2)]),
    section("conversa", context.messages.map((message) => `${message.direction}: ${message.body ?? ""}`)),
    section("tarefa atual", [
      "Gere uma resposta sugerida e segura para revisão manual.",
      "Inclua fontes do tipo catalog, conversation, profile ou rule.",
    ]),
  ].join("\n\n");
}

function section(title: string, lines: string[]) {
  return `## ${title}\n${lines.join("\n")}`;
}
