# Shamar OpenWA Gateway

Gateway WhatsApp Web real para o Shamar Connect usando `@open-wa/wa-automate`.

## Railway

Configuração do serviço:

```text
Root Directory: /gateway/openwa
Builder: Dockerfile
Volume mount: /data
Domain: gateway.shamarconnect.com.br
```

Variáveis mínimas:

```env
PORT=8787
OPENWA_API_KEY=troque-por-token-grande
OPENWA_SESSION_ID=lips-main
OPENWA_SESSIONS=lips-main
SESSION_DATA_PATH=/data/openwa
SHAMARCONNECT_WEBHOOK_URL=https://www.shamarconnect.com.br/api/webhooks/openwa
OPENWA_WEBHOOK_SECRET=troque-por-token-grande
AUTO_START=true
```

Para múltiplos clientes:

```env
OPENWA_SESSIONS=lips-main,hall-main,viciados-main
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

Conectar sessão:

```bash
curl -X POST https://gateway.shamarconnect.com.br/api/sessions/lips-main/connect \
  -H "X-API-Key: $OPENWA_API_KEY"
```

QR:

```bash
curl https://gateway.shamarconnect.com.br/api/sessions/lips-main/qr \
  -H "X-API-Key: $OPENWA_API_KEY"
```

Enviar texto:

```bash
curl -X POST https://gateway.shamarconnect.com.br/api/sessions/lips-main/messages/send-text \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $OPENWA_API_KEY" \
  -d '{"chatId":"5521982411499@c.us","text":"Teste real OpenWA Lips"}'
```

Endpoint legado compatível com o Shamar Connect atual:

```bash
curl -X POST https://gateway.shamarconnect.com.br/api/sessions/lips-main/send-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENWA_API_KEY" \
  -d '{"to":"5521982411499@c.us","body":"Teste real OpenWA Lips"}'
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

Grupos são ignorados no gateway antes do webhook.
