# Central de atendimento WhatsApp

Este documento registra o redesenho da tela de Mensagens WhatsApp/Inbox para uma experiência mais próxima de uma central de atendimento.

## Objetivo

Criar uma tela operacional para atendimento, leitura de conversas, envio individual de mensagens e conexão com o CRM.

## Página atualizada

```txt
/whatsapp-messages
```

Arquivo:

```txt
app/whatsapp-messages/page.tsx
```

Agora usa:

```tsx
<WhatsappServiceCenter />
```

## Componente criado

```txt
components/whatsapp-service-center.tsx
```

O componente entrega:

- visão de conversas à esquerda;
- busca por conversa, telefone ou mensagem;
- leitura das mensagens no painel central;
- painel lateral com dados do contato;
- botão para sincronizar histórico da conversa;
- caixa de resposta manual;
- envio individual pelo WhatsApp Web Gateway;
- registro da mensagem enviada no Supabase;
- atalhos para CRM e importação WhatsApp;
- área reservada para respostas rápidas e IA.

## APIs criadas

### Listar conversas

```txt
GET /api/whatsapp-messages/conversations
```

Busca em:

```txt
whatsapp_conversations
whatsapp_messages
crm_contacts
```

Retorna também a última mensagem conhecida por conversa.

### Listar mensagens de uma conversa

```txt
GET /api/whatsapp-messages/conversations/[conversationId]/messages
```

Busca as mensagens salvas em:

```txt
whatsapp_messages
```

### Enviar mensagem pela central

```txt
POST /api/whatsapp-messages/conversations/[conversationId]/send
```

Payload esperado:

```json
{
  "body": "Mensagem para enviar"
}
```

Fluxo executado:

1. Busca a conversa no Supabase.
2. Usa o `external_chat_id` como destino.
3. Envia pelo Railway WhatsApp Web Gateway.
4. Salva a mensagem em `whatsapp_messages` como `outbound`.
5. Atualiza `last_message_at` em `whatsapp_conversations`.
6. Registra evento `message.sent` em `provider_events`.

## Função operacional importante

A tela permite sincronizar o histórico da conversa selecionada usando:

```txt
POST /api/whatsapp-web/chats/import-history
```

Esse endpoint depende do WhatsApp Web Gateway estar conectado e com status `ready`.

## Limitações atuais

- Envio liberado apenas para mensagens individuais pela conversa selecionada.
- Ainda não há anexos, áudio ou imagem.
- Respostas rápidas e IA aparecem como preparação, mas ainda estão bloqueadas.
- A tela depende de conversas e mensagens já salvas ou sincronizadas.

## Próximas evoluções

1. Salvar contato manualmente no CRM a partir da conversa.
2. Aplicar tags no contato.
3. Criar respostas rápidas.
4. Gerar resposta com IA.
5. Criar tarefa de follow-up.
6. Mostrar histórico completo do lead.
7. Criar filtros por status, grupo, contato e origem.
8. Enviar anexos depois da validação do texto.
