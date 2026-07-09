# Shamar OpenWA Gateway Legacy

Este diretório contém o wrapper legado que usava `@open-wa/wa-automate`.

O gateway real da operação Lips agora deve ser o OpenWA oficial em repositório separado:

```text
https://github.com/akccastro-allan/OpenWA
```

O Shamar Connect consome esse gateway via HTTP usando `WHATSAPP_WEB_GATEWAY_URL` e `WHATSAPP_WEB_GATEWAY_TOKEN`.
Não use este diretório como fonte do serviço Railway novo.

## Railway

Configuração recomendada do serviço oficial:

```text
Repository: akccastro-allan/OpenWA
Builder: Dockerfile
Domain: gateway.shamarconnect.com.br
```

Variáveis mínimas:

```env
PORT=2785
API_MASTER_KEY=troque-por-token-grande
SESSION_DATA_PATH=/app/data/sessions
STORAGE_LOCAL_PATH=/app/data/media
ENGINE_TYPE=whatsapp-web.js
OPENWA_WEBHOOK_SECRET=troque-por-token-grande
```

No app Shamar Connect:

```env
WHATSAPP_WEB_GATEWAY_URL=https://gateway.shamarconnect.com.br
WHATSAPP_WEB_GATEWAY_TOKEN=<API_MASTER_KEY ou API key operator do OpenWA>
WHATSAPP_WEB_GATEWAY_SESSION_ID=lips-main
OPENWA_WEBHOOK_SECRET=<mesmo secret configurado no webhook do OpenWA>
```

## Endpoints

Todos os endpoints protegidos aceitam:

```text
X-API-Key: <OPENWA_API_KEY>
Authorization: Bearer <OPENWA_API_KEY>
```

Health público:

```bash
curl https://gateway.shamarconnect.com.br/api/health
```

Criar sessão oficial:

```bash
curl -X POST https://gateway.shamarconnect.com.br/api/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $OPENWA_API_KEY" \
  -d '{"name":"lips-main"}'
```

Iniciar sessão:

```bash
curl -X POST https://gateway.shamarconnect.com.br/api/sessions/$SESSION_ID/start \
  -H "X-API-Key: $OPENWA_API_KEY"
```

QR:

```bash
curl https://gateway.shamarconnect.com.br/api/sessions/$SESSION_ID/qr \
  -H "X-API-Key: $OPENWA_API_KEY"
```

Enviar texto:

```bash
curl -X POST https://gateway.shamarconnect.com.br/api/sessions/$SESSION_ID/messages/send-text \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $OPENWA_API_KEY" \
  -d '{"chatId":"5521982411499@c.us","text":"Teste real OpenWA Lips"}'
```

## Webhook

Eventos enviados para o Shamar Connect:

```text
message.received
session.status
```

URL padrão:

```text
https://www.shamarconnect.com.br/api/webhooks/openwa
```

No OpenWA oficial, registre o webhook na sessão `lips-main` com:

```json
{
  "url": "https://www.shamarconnect.com.br/api/webhooks/openwa",
  "events": ["message.received", "session.status"],
  "secret": "mesmo-valor-de-OPENWA_WEBHOOK_SECRET",
  "retryCount": 3
}
```

Grupos continuam sendo ignorados pelo Shamar Connect antes de persistir qualquer mensagem.
