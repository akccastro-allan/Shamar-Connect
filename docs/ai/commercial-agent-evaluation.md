# Agente Comercial — Avaliação

## Eventos

Registrar somente dados estruturados:

- análise gerada;
- sugestão gerada;
- aprovada sem edição;
- aprovada com edição;
- rejeitada;
- motivo da rejeição;
- resultado comercial.

## Proibido

Não armazenar chain of thought.

Não armazenar prompt completo.

Não armazenar mensagem completa em log operacional.

## Justificativa Curta

Motivos de rejeição e observações devem ser curtos, sanitizados e limitados.

## Métricas Úteis

- taxa de sugestão aprovada;
- taxa de edição antes do uso;
- taxa de rejeição;
- principais motivos de rejeição;
- oportunidades abertas;
- oportunidades ganhas;
- oportunidades perdidas;
- follow-ups vencidos;
- tempo médio até próxima ação.
- latência do provider;
- tokens de entrada/saída;
- custo estimado;
- taxa de `invalid_structured_output`, `timeout`, `rate_limited` e `guardrail_rejected`.

## Painel Interno

O painel `/admin/commercial-agent/lips/evaluation` mostra apenas dados estruturados da organização Lips:

- contagem de análises e sugestões;
- rejeições e guardrails;
- perfil ativo, stage e modo de resposta;
- latência média, tokens e custo estimado;
- resumo comercial das últimas análises.

O painel não exibe prompt, JSON bruto, chain of thought ou mensagem completa.

## Segurança

Toda avaliação deve carregar `tenant_id`, `organization_id` e `conversation_id` para manter isolamento e auditoria.

Deduplicação usa `conversation_content_hash`, `profile_version`, `prompt_version` e `model` para evitar custo duplicado na mesma versão de contexto.
