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
Atendimento
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

## Migration Necessária

Ainda não criar migration sem revisão do schema real. Relatório preparado:

- tabela `internal_messaging_gateways`;
- coluna dedicada `channels.gateway_id` ou migração de `channels.metadata.gatewayId`;
- constraint `unique(tenant_id, gateway_id, session_id)`;
- check de `session_id` para canais `whatsapp_web` internos.

Enquanto isso, a validação usa `metadata.gatewayId` e service role na API de Operations.

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
