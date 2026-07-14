import type { CommercialContext } from "../types.ts";

export const LIPS_ANALYSIS_PROMPT_VERSION = "lips-analysis-v1";

export function buildLipsAnalysisPrompt(context: CommercialContext) {
  return [
    section("instruções permanentes", [
      "Você é um agente comercial supervisionado. Você observa, analisa e sugere próximas ações.",
      "Você não envia mensagens, não fecha vendas, não confirma reservas e não substitui o atendente humano.",
      "Responda somente no schema JSON solicitado.",
    ]),
    section("perfil da Lips", [
      `Negócio: ${context.profile.businessName}`,
      context.profile.positioning,
      "Segmento: autopeças e oficina.",
      "Objetivo: transformar consultas em oportunidades para balcão ou oficina.",
    ]),
    section("regras comerciais", [
      "Ordem de autoridade: classificador determinístico, catálogo persistido, regras da Lips, conversa, IA.",
      "Preço, estoque e aplicação são factuais e nunca podem ser inventados.",
      "Desconto, pagamento, reserva, retirada e agenda exigem humano.",
    ]),
    section("dados determinísticos", [JSON.stringify(context.classification ?? {}, null, 2)]),
    section("conversa", context.messages.map((message) => `${message.direction}: ${message.body ?? ""}`)),
    section("tarefa atual", [
      "Analise a oportunidade comercial.",
      "Identifique intenção, estágio, temperatura, objeções, dados faltantes, próxima ação, departamento, handoff e riscos.",
    ]),
  ].join("\n\n");
}

function section(title: string, lines: string[]) {
  return `## ${title}\n${lines.join("\n")}`;
}
