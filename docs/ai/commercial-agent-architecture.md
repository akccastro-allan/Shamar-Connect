# Agente Comercial — Arquitetura

## Objetivo

O agente comercial ajuda a qualificar oportunidades, tratar objeções, sugerir respostas e preparar follow-ups. Ele não é chatbot genérico e não tem autonomia para fechar venda ou enviar WhatsApp automaticamente.

## Separação

Centro de Comando usa empresas internas da Moriah. Lips continua como tenant e organização cliente do Shamar Connect.

Dados de tenant, organização, canal, conversa, contato, catálogo, atribuição, departamento e perfil são sempre montados com escopo explícito.

## Domínio

Código base em `lib/ai/commercial-agent/`:

- `types.ts`: contratos do agente, análises, sugestões, provider e perfis.
- `profiles.ts`: perfil Lips e placeholders controlados das empresas internas.
- `context-builder.ts`: montagem e limitação de contexto.
- `lead-classifier.ts`: análise comercial determinística inicial.
- `next-action.ts`: follow-up e bloqueio de envio no modo observer.
- `response-suggester.ts`: sugestão supervisionada sem IA externa.
- `guardrails.ts`: validação pós-geração.
- `evaluation.ts`: eventos estruturados sem chain of thought.

## Provider

A abstração é `CommercialAgentProvider`:

```ts
type CommercialAgentProvider = {
  analyzeConversation(input: CommercialAnalysisInput): Promise<CommercialAnalysis>;
  suggestResponse(input: CommercialSuggestionInput): Promise<CommercialSuggestion>;
};
```

Nenhum provedor externo é chamado nesta fase.

## Modos

- `observer`: analisa e sugere, sem enviar.
- `copilot`: prepara sugestões para humano.
- `assisted`: pode preparar fluxos assistidos, ainda com aprovação.
- `approved_automation`: reservado para etapa futura.

Estado inicial: Centro de Comando e Lips em `observer`.

## APIs

- `POST /api/commercial-agent/analyze`
- `POST /api/commercial-agent/suggest`
- `GET /api/commercial-agent/conversations/:id/analysis`
- `PATCH /api/commercial-agent/suggestions/:id`

Nenhuma rota envia WhatsApp.

## Feature Flags

Estados iniciais planejados:

```text
ai_internal = internal_alpha
commercial_agent = internal_alpha
commercial_agent_lips = internal_alpha
commercial_agent_suggestions = internal_alpha
commercial_agent_automation = hidden
```

## Banco

Migration preparada em `supabase/migrations/0033_commercial_agent_foundation.sql`.

Ela não deve ser aplicada em produção sem aprovação operacional.
