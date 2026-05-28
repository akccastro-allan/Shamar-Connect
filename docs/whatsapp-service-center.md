# Central de atendimento WhatsApp

Este documento registra o redesenho da tela de Mensagens WhatsApp/Inbox para uma experiência mais próxima de uma central de atendimento.

## Objetivo

Criar uma tela operacional para atendimento, leitura de conversas e conexão com o CRM.

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

## Função operacional importante

A tela permite sincronizar o histórico da conversa selecionada usando:

```txt
POST /api/whatsapp-web/chats/import-history
```

Esse endpoint depende do WhatsApp Web Gateway estar conectado e com status `ready`.

## Limitações atuais

- Ainda não envia mensagens pela central.
- Respostas rápidas e IA aparecem como preparação, mas ainda estão bloqueadas.
- A tela depende de conversas e mensagens já salvas ou sincronizadas.

## Próximas evoluções

1. Enviar mensagem pela central.
2. Salvar contato manualmente no CRM a partir da conversa.
3. Aplicar tags no contato.
4. Criar respostas rápidas.
5. Gerar resposta com IA.
6. Criar tarefa de follow-up.
7. Mostrar histórico completo do lead.
8. Criar filtros por status, grupo, contato e origem.
