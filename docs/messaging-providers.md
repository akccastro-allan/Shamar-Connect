# Camada abstrata de providers de mensagens

Este documento registra o Bloco 2 da evolução do ShamarConnect: criação da camada abstrata de providers.

---

## Modelo de canais (Bloco 1 — multi-canal) — atualizado 2026-06-21

Persistência dos canais. Cada conversa/mensagem carrega `channel_id` → `public.channels`.
O `provider` do canal decide o caminho de envio/recebimento.

- `public.channels` — um registro por canal. Campos **não-secretos**: `provider`,
  `channel_type`, `display_name`, `phone_number`, `phone_number_id`, `waba_id`,
  `business_account_id`, `status`, `is_default`, `metadata`, `session_id`, `name`.
  **RLS public_read → nunca guardar segredo aqui.**
- `public.channel_credentials` — segredos (`access_token`, `verify_token`), PK
  `channel_id`, **RLS service_role only**.
- `public.social_accounts` — contas Instagram/Messenger (token por conta).
- `whatsapp_conversations.channel_id` (já existia) e `whatsapp_messages.channel_id`
  (adicionado no Bloco 1).

Decisão: estendemos `channels` em vez de criar `messaging_channels` — ver
`docs/decisions/0002-canais-oficiais-e-whatsapp-web.md`. Migração:
`supabase/migrations/0018_multichannel_channels_fields.sql` (aplicada em produção).

Próximo: conectar a camada de providers abaixo ao `channel_id` (escolher provider e
credenciais pelo canal da conversa, não por env global).

---

## Objetivo

Permitir que a Central de Atendimento e as APIs do ShamarConnect trabalhem com múltiplos canais de mensagens sem depender diretamente de uma implementação específica.

Providers planejados:

```txt
whatsapp_web
meta_whatsapp
telegram futuramente
```

## Status deste bloco

Este bloco não troca o envio atual da Central WhatsApp.

Ele apenas prepara a arquitetura para que o próximo bloco possa substituir chamadas diretas ao WhatsApp Web Gateway por uma chamada genérica ao provider ativo.

## Arquivos criados

```txt
lib/messaging/types.ts
lib/messaging/providers/whatsapp-web-provider.ts
lib/messaging/providers/meta-whatsapp-provider.ts
lib/messaging/index.ts
app/api/messaging/status/route.ts
```

## API criada

```txt
GET /api/messaging/status
```

Retorna:

```txt
provider ativo
status do provider ativo
status do WhatsApp Web
status da Meta WhatsApp API
horário da checagem
```

## Variável usada para provider ativo

```env
NEXT_PUBLIC_ACTIVE_MESSAGING_PROVIDER=whatsapp_web
```

Valores aceitos inicialmente:

```txt
whatsapp_web
meta_whatsapp
meta_cloud_api
```

## WhatsApp Web Provider

Arquivo:

```txt
lib/messaging/providers/whatsapp-web-provider.ts
```

Usa o client existente:

```txt
lib/providers/whatsapp-web-gateway-client.ts
```

Depende das variáveis:

```env
WHATSAPP_WEB_GATEWAY_URL=
WHATSAPP_WEB_GATEWAY_TOKEN=
```

## Meta WhatsApp Provider

Arquivo:

```txt
lib/messaging/providers/meta-whatsapp-provider.ts
```

Depende das variáveis:

```env
META_WHATSAPP_TOKEN=
META_WHATSAPP_PHONE_NUMBER_ID=
META_WHATSAPP_BUSINESS_ACCOUNT_ID=
META_WHATSAPP_WEBHOOK_VERIFY_TOKEN=
```

Neste bloco, o provider Meta consegue:

- consultar status básico do número;
- enviar mensagem de texto;
- normalizar payload inbound da Meta.

O webhook ainda será criado em bloco futuro.

## Regras importantes

- Não remover WhatsApp Web.
- Não trocar provider ativo sem teste.
- Não colocar token da Meta no client.
- Não liberar disparo em massa.
- Não automatizar respostas sem revisão humana.

## Próximo bloco recomendado

Bloco 3:

```txt
Integrar o endpoint de envio da Central WhatsApp à camada abstrata de providers.
```

Hoje o endpoint de envio ainda pode chamar diretamente o WhatsApp Web Gateway. No próximo bloco, ele deve usar:

```ts
getMessagingProvider().sendTextMessage()
```

Assim a troca entre WhatsApp Web e Meta será feita pela variável de ambiente ou, futuramente, pelo canal da empresa.
