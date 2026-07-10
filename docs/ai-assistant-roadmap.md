# Assistente de Atendimento — Roadmap

## Objetivo

Preparar o Shamar Connect para usar ChatGPT/OpenAI como camada assistiva nos atendimentos.

## Escopo inicial

A IA não responde sozinha ao cliente.

A IA ajuda o atendente com:

- sugestão de resposta;
- resumo da conversa;
- classificação da intenção;
- sugestão de departamento;
- identificação de urgência;
- sugestão de tags;
- apoio na consulta de histórico.

## Modos

- off
- suggestion_only
- supervised
- auto_reply_limited

## Padrão atual

off

## Regras de segurança

A IA não pode:

- fechar venda;
- reservar produto;
- enviar PIX;
- confirmar pagamento;
- confirmar agendamento;
- alterar cadastro crítico;
- prometer prazo;
- responder fora das políticas da operação.

## Comercialização futura

O Centro de Comando é interno no início, mas deve ser arquitetado para possível venda futura.

Toda integração deve considerar multi-tenant, permissões, auditoria, LGPD e feature flags.
