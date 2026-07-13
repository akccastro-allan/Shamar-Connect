# Internal Channels Setup

Data: 2026-07-12

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
- gateway para WhatsApp Web;
- tipo de canal;
- nome de exibição;
- finalidade;
- session ID gerado automaticamente para WhatsApp Web;
- identificador externo não secreto;
- status;
- estágio interno.

Segredos não entram nessa tela. Tokens, API keys, refresh tokens, cookies e service role devem ficar em storage seguro, nunca em `channels.metadata`.

O cadastro preparatório não gera QR, não cria sessão no gateway e não ativa automação.

## Finalidades

- `support`: atendimento;
- `sales`: vendas;
- `parents`: pais e responsáveis;
- `operations`: operação interna;
- `personal`: pessoal;
- `marketing`: marketing;
- `notifications`: notificações financeiras e operacionais;
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

Estados iniciais:

- WhatsApp individual interno: `internal_alpha`;
- grupos: `internal_alpha`;
- comunidades: `internal_alpha`;
- redes sociais: `internal_alpha`;
- IA interna: `hidden`.

## Modelo de Origem

Cada canal deve gerar um contexto seguro para inbox e diagnóstico:

- empresa;
- canal;
- conta;
- `session_id`;
- gateway;
- finalidade.

Exemplo exibido ao operador:

```text
OriahFin
WhatsApp
oriahfin-01
Notificações
```

Não exibir `tenant_id`, `organization_id`, `provider_type`, API key, secret, payload bruto ou UUID sem contexto na tela principal.

## Grupos

Modelo preparado nesta etapa:

- identificador;
- nome;
- canal;
- sessão;
- participantes;
- administradores;
- último evento;
- status de leitura;
- possibilidade futura de resposta manual.

Envio real permanece desabilitado.

## Comunidades

Modelo preparado nesta etapa:

- comunidade;
- grupo de anúncios;
- grupos vinculados;
- administradores;
- metadata;
- limitações do provider.

Envio real permanece desabilitado até validação do provider.

## Redes Sociais

Estrutura interna prevista para Instagram, Facebook e TikTok:

- provider;
- account_label;
- external_account_id;
- page_id;
- business_id;
- status;
- token_status;
- token_expires_at;
- last_event_at;
- last_error.

Tokens não retornam ao frontend. Estados exibidos: Não conectado, Conectado, Token expirado e Erro de conexão.

## Gateways Persistidos

Gateways internos agora usam `internal_messaging_gateways` e `channels.gateway_id`.

- `internal_messaging_gateways` é service-role only;
- `channels.gateway_id` segue nullable durante transição;
- constraint `unique(tenant_id, gateway_id, session_id)`;
- fallback de `metadata.gatewayId` existe apenas para canais antigos da branch.

Não aplicar migration em produção sem revisão operacional.

A tela deve diferenciar dois indicadores:

- total do gateway: quantidade de canais cadastrados no gateway;
- uso por empresa: sequência `01` até `09` daquela empresa naquele gateway.

Exemplo após os primeiros drafts:

- Gateway 01: 2 canais cadastrados;
- OriahFin: sessão 01 de até 09;
- Viciados em Trilhas: sessão 01 de até 09.

## QR e Status

Rotas internas:

- `POST /api/operations/internal-channels/:id/qr`;
- `GET /api/operations/internal-channels/:id/status`.

As rotas resolvem `channel -> gateway_id -> session_id -> gateway`. Não aceitam `sessionId` livre.

## Diagnóstico

Registrar apenas dados seguros:

- canal resolvido;
- provider;
- status;
- último inbound/outbound;
- último erro resumido;
- sessão/conta mascarada quando necessário.

Não registrar token, secret, telefone completo, payload completo ou mensagem completa sem necessidade operacional.

## Dados Necessários do Allan

Para conexão real, coletar apenas:

- empresa;
- número autorizado de cada WhatsApp;
- finalidade do número;
- gateway escolhido;
- conta Instagram/Facebook/TikTok quando aplicável;
- página ou business associado quando aplicável.

## Canais Iniciais em Draft

Primeiros canais internos previstos no Gateway 01:

- OriahFin: `oriahfin-01`, WhatsApp Web, finalidade `notifications`, status `draft`, sem telefone, sem QR e sem sessão iniciada;
- Viciados em Trilhas: `viciados-01`, WhatsApp Web, finalidade `sales`, status `draft`, sem telefone, sem QR e sem sessão iniciada.

Esses cadastros não alteram a Lips e não preenchem `gateway_id` do canal `lips-main`.
