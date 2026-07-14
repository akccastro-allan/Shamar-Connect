# Agente Comercial — Operação

## Estado Atual

Piloto Lips em `observer` e `internal_alpha`.

O agente pode analisar conversas e preparar sugestões supervisionadas. Ele não envia WhatsApp, não fecha venda, não reserva produto e não altera preço.

## Variáveis

Obrigatórias para uso real do provider:

- `OPENAI_API_KEY`
- `OPENAI_COMMERCIAL_AGENT_MODEL`
- `OPENAI_COMMERCIAL_AGENT_ENABLED=true`

Default seguro:

- `OPENAI_COMMERCIAL_AGENT_ENABLED=false`

Sem essa configuração, as rotas falham fechado com erro operacional e não usam mock em produção.

## Flags

Tenant plataforma:

- `commercial_agent = internal_alpha`
- `commercial_agent_lips = internal_alpha`
- `commercial_agent_suggestions = internal_alpha`
- `commercial_agent_automation = hidden`

## Perfil Lips

Perfil esperado em `commercial_agent_profiles`:

- `name = lips-commercial-observer`
- `response_mode = observer`
- `stage = internal_alpha`
- `pricing_authority = catalog`
- `stock_authority = catalog`

## Acesso

Somente tenant plataforma com role `owner` ou `admin` e feature `commercial_agent_lips` ativa pode chamar as APIs do piloto Lips.

Atendentes e usuários comuns da Lips não recebem acesso ao painel interno.

## Painel

Use `/admin/commercial-agent/lips/evaluation` para acompanhar análise, sugestão, guardrails, uso de tokens, custo estimado e latência.

## Bloqueio Conhecido

`allan@shamarconnect.com.br` precisa existir no Auth e ter membership no tenant plataforma antes de testar o acesso real com essa identidade.

## Proibições

- Não ativar `commercial_agent_automation`.
- Não promover Lips para `copilot` sem decisão operacional.
- Não chamar OpenAI real em produção sem habilitar explicitamente as variáveis.
- Não exibir prompt, chain of thought, tokens sensíveis ou payload bruto em UI/logs.
- Não misturar dados Lips com Centro de Comando ou empresas internas da Moriah.
