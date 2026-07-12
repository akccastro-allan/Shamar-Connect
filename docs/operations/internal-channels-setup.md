# Internal Channels Setup

Data: 2026-07-11

Escopo: Centro de Comando Allan/Moriah. Não usar para clientes SaaS como Lips, Hall ou NutriFlow.

## Empresas Permitidas

- Moriah Systems
- Allan / Pessoal
- Viciados em Trilhas
- MK Shalom
- Shamar Connect
- Shamar ERP
- Shamar Church
- Shamar Kids
- Shamar Events
- OriahFin

Clientes SaaS ficam na Administração do Shamar Connect, fora de `/operations`.

## Cadastro

Tela interna: `/operations/channels`.

Campos:

- empresa interna;
- tipo de canal;
- nome de exibição;
- finalidade;
- session ID ou identificador não secreto;
- identificador externo não secreto;
- status;
- estágio interno.

Segredos não entram nessa tela. Tokens, API keys, refresh tokens, cookies e service role devem ficar em storage seguro, nunca em `channels.metadata`.

## Finalidades

- `support`: atendimento;
- `sales`: vendas;
- `parents`: pais e responsáveis;
- `operations`: operação interna;
- `personal`: pessoal;
- `marketing`: marketing;
- `community`: comunidade;
- `other`: outro.

## Segurança

- Origem sempre vem de `channel_id`.
- Resposta manual deve resolver `conversation -> channel_id -> provider -> sessão/conta`.
- Nunca escolher manualmente outra sessão para responder conversa existente.
- Canal desconectado deve bloquear envio.
- Clientes SaaS não acessam `/operations/channels`.

## Feature Flags Internas

- `whatsapp_groups_internal`
- `whatsapp_communities_internal`
- `social_channels_internal`
- `ai_internal`

As flags só valem para platform owner/admin com `command_center` habilitado.

## Diagnóstico

Registrar apenas dados seguros:

- canal resolvido;
- provider;
- status;
- último inbound/outbound;
- último erro resumido;
- sessão/conta mascarada quando necessário.

Não registrar token, secret, telefone completo, payload completo ou mensagem completa sem necessidade operacional.
