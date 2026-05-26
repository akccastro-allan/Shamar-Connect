# Integração WhatsApp Web Lab com whatsapp-web.js

## Decisão

Não devemos colocar `whatsapp-web.js` diretamente dentro do app Next.js hospedado na Vercel.

Motivo: a biblioteca depende de Puppeteer/Chrome, sessão persistente e processo contínuo. A Vercel deve continuar hospedando a interface, CRM, APIs leves e integração com Supabase. O WhatsApp Web experimental deve rodar em um serviço separado chamado **WhatsApp Web Gateway**.

## O que aproveitar do pacote enviado

O ZIP contém a biblioteca `whatsapp-web.js` versão 1.34.7. Ela expõe:

- `Client`: cliente principal para controlar WhatsApp Web;
- `LocalAuth`: autenticação local por diretório de sessão;
- `RemoteAuth`: autenticação remota com store externo;
- evento `qr`: geração de QR Code;
- evento `code`: pareamento por código;
- evento `ready`: cliente pronto;
- evento `authenticated`: sessão autenticada;
- evento `auth_failure`: falha de sessão;
- evento `disconnected`: queda ou logout;
- evento `message`: mensagens recebidas;
- evento `message_create`: mensagens criadas, incluindo as enviadas pelo próprio usuário;
- `sendMessage`: envio de mensagem;
- `getChats`: leitura de chats;
- `getContacts`: leitura de contatos;
- `getContactById`: enriquecimento de contato;
- `GroupChat.participants`: participantes de grupo visíveis ao cliente conectado;
- `MessageMedia`: envio/recebimento de mídia.

## O que não copiar

Não copiar o repositório inteiro para dentro do ShamarConnect.

Usar como dependência dentro de um gateway Node.js separado:

```bash
npm install whatsapp-web.js qrcode express cors helmet
```

## Risco e governança

O próprio pacote inclui um disclaimer informando que é biblioteca não oficial, não afiliada nem autorizada pela Meta/WhatsApp, com risco de violar termos e de bloqueio da conta. Portanto, no ShamarConnect esta integração deve ser tratada como:

- laboratório;
- MVP controlado;
- uso interno/teste;
- sem promessa de produção definitiva;
- sem disparo em massa;
- sem automação agressiva;
- sempre com caminho de migração para WhatsApp Business Platform oficial.

## Arquitetura recomendada

```txt
ShamarConnect Next.js/Vercel
  ├─ UI, dashboard, CRM, Feature Lab
  ├─ Supabase: contatos, listas, conversas, auditoria
  └─ HTTP client interno
        ↓
WhatsApp Web Gateway Node.js
  ├─ whatsapp-web.js
  ├─ Puppeteer/Chrome
  ├─ sessão persistente LocalAuth ou RemoteAuth
  ├─ eventos de mensagem
  ├─ QR Code/pairing code
  └─ webhooks para ShamarConnect
        ↓
WhatsApp Web
```

## Endpoints mínimos do Gateway

### GET `/health`

Retorna status do gateway.

### GET `/status`

Retorna estado da conexão:

```json
{
  "provider": "whatsapp_web",
  "status": "ready",
  "phone": "+5511999999999",
  "lastSyncAt": "2026-05-26T22:00:00.000Z"
}
```

### POST `/connect`

Inicializa o client se ainda não estiver rodando.

### GET `/qr`

Retorna QR Code atual ou pairing code quando disponível.

### POST `/send-message`

Envia mensagem individual.

```json
{
  "to": "5511999999999@c.us",
  "body": "Olá, posso te ajudar?"
}
```

### GET `/chats`

Lista chats recentes para sincronização.

### GET `/groups`

Lista grupos visíveis.

### GET `/groups/:groupId/participants`

Retorna participantes visíveis para criar lista rascunho no CRM.

### POST `/logout`

Derruba sessão e limpa credenciais locais/remotas.

## Eventos que o Gateway deve enviar ao ShamarConnect

Webhook interno:

```txt
POST /api/provider-events/whatsapp-web
```

Eventos normalizados:

- `connection.qr_received`;
- `connection.authenticated`;
- `connection.ready`;
- `connection.disconnected`;
- `message.received`;
- `message.created`;
- `group.participants.extracted`.

## Fase 1: WhatsApp Web Lab

1. Criar gateway Node.js em outro serviço.
2. Expor QR Code na tela `Feature Lab`.
3. Receber mensagens no ShamarConnect via webhook interno.
4. Salvar contatos/conversas no Supabase.
5. Testar extração de participantes de grupo para lista rascunho.
6. Bloquear campanhas para contatos sem opt-in.

## Fase 2: Migração oficial

Manter a mesma interface interna de provider e trocar implementação:

```txt
whatsapp_web_gateway → meta_cloud_api_provider
```

Assim, a UI, CRM, listas, auditoria e IA continuam iguais. Só muda o adaptador de envio/recebimento.
