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

## Segurança

Toda avaliação deve carregar `tenant_id`, `organization_id` e `conversation_id` para manter isolamento e auditoria.
