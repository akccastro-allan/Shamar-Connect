# WhatsApp Message Reader

Este documento registra a área de leitura e conversa manual de mensagens do WhatsApp Web no ShamarConnect.

## Objetivo

Permitir que o usuário leia mensagens disponíveis no WhatsApp Web conectado, converse em chats privados ou grupos e salve manualmente apenas as mensagens úteis para CRM, atendimento, histórico ou auditoria.

A ideia é funcionar como uma área parecida com o WhatsApp Web, mas com controle manual de persistência.

## Página criada

```txt
/whatsapp-messages
```

Arquivo:

```txt
app/whatsapp-messages/page.tsx
```

Componente principal:

```txt
components/whatsapp-reader-panel.tsx
```

## Fluxo de uso

1. O sistema lista conversas visíveis no WhatsApp Web conectado.
2. O usuário escolhe uma conversa privada ou grupo.
3. O sistema carrega as últimas mensagens da conversa.
4. O usuário pode responder diretamente pela tela.
5. O usuário pode selecionar mensagens que deseja salvar.
6. Apenas as mensagens selecionadas são enviadas para o Supabase.
7. O sistema salva contato, conversa e mensagens.

## Endpoints criados

### Ler mensagens de uma conversa

```txt
GET /api/whatsapp-web/chats/[chatId]/messages?limit=50
```

Este endpoint chama o gateway Railway e retorna mensagens recentes da conversa.

### Salvar mensagens selecionadas

```txt
POST /api/whatsapp-web/messages/save-selected
```

Payload esperado:

```json
{
  "messages": []
}
```

O endpoint salva dados em:

```txt
crm_contacts
whatsapp_conversations
whatsapp_messages
```

### Enviar mensagem

```txt
POST /api/whatsapp-web/messages/send
```

Payload esperado:

```json
{
  "to": "chat-id-ou-grupo-id",
  "body": "Texto da mensagem",
  "chatName": "Nome da conversa",
  "isGroup": false
}
```

Esse endpoint envia pelo gateway WhatsApp Web e também salva a mensagem enviada em:

```txt
whatsapp_messages
```

com:

```txt
direction = outbound
```

## Conversas privadas e grupos

A tela usa o `chatId` vindo do WhatsApp Web.

Para contatos privados, normalmente o destino termina com:

```txt
@c.us
```

Para grupos, normalmente o destino termina com:

```txt
@g.us
```

O gateway envia para ambos usando o mesmo endpoint `/send-message`.

## Comportamento importante

As mensagens lidas não são salvas automaticamente pela tela. O usuário precisa selecionar quais mensagens deseja guardar.

As mensagens enviadas pela tela são salvas automaticamente como `outbound`, porque foram geradas dentro do próprio ShamarConnect.

Isso evita carregar todo o histórico do aparelho sem controle e permite usar a base do CRM com mais qualidade.

## Menu

A página foi adicionada ao menu lateral como:

```txt
Mensagens WhatsApp
```

## Limites atuais

A tela permite carregar:

```txt
25
50
100
200
```

mensagens recentes por conversa.

## Próximas evoluções

1. Criar busca dentro das mensagens carregadas.
2. Criar filtro por recebidas/enviadas.
3. Criar visual mais parecido com balões de conversa.
4. Salvar conversa inteira com confirmação.
5. Adicionar suporte a mídia, áudio e imagens.
6. Marcar mensagens como importantes.
7. Criar vínculo com oportunidade no funil.
8. Criar respostas rápidas e templates internos.
9. Adicionar envio de arquivos quando o gateway suportar mídia.
