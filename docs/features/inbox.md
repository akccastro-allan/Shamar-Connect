# P1.3 — Inbox completo

Status: implementado.

## Objetivo

Transformar o Inbox em uma central de atendimento manual com leitura, resposta, sincronização controlada, CRM, notas, tags, consentimento, status e respostas rápidas.

## Regra de segurança

O Inbox não puxa conversas pessoais automaticamente.

Ele exibe e opera somente dados já gravados manualmente nas tabelas:

```txt
whatsapp_conversations
whatsapp_messages
crm_contacts
crm_contact_notes
quick_replies
```

## Fluxo correto de uso

1. Acessar `/feature-lab`.
2. Clicar em `Listar conversas`.
3. Selecionar uma conversa.
4. Clicar em `Salvar conversa selecionada`.
5. Acessar `/inbox`.
6. Selecionar a conversa.
7. Clicar em `Sincronizar esta conversa` para buscar as últimas mensagens apenas daquela conversa.
8. Ler, responder e atualizar CRM dentro do Inbox.

## Página

```txt
/inbox
```

Arquivo:

```txt
app/inbox/page.tsx
```

## Componente principal

```txt
components/inbox/inbox-panel.tsx
```

Funções da interface:

- Listar conversas salvas.
- Selecionar uma conversa.
- Carregar mensagens da conversa selecionada.
- Sincronizar mensagens da conversa selecionada.
- Diferenciar mensagens recebidas e enviadas.
- Enviar resposta manual via WhatsApp Web.
- Salvar mensagem enviada no Supabase.
- Atualizar status da conversa.
- Atualizar etapa de funil.
- Atualizar prioridade.
- Editar dados do contato.
- Alterar consentimento.
- Aplicar tags manuais.
- Criar notas internas.
- Usar respostas rápidas.
- Mostrar aviso de modo seguro.

## APIs

### Listar conversas salvas

```txt
GET /api/inbox/conversations
```

Arquivo:

```txt
app/api/inbox/conversations/route.ts
```

Retorna registros da tabela `whatsapp_conversations` com contato relacionado.

### Listar mensagens por conversa

```txt
GET /api/inbox/messages?conversationId=<id>
```

Arquivo:

```txt
app/api/inbox/messages/route.ts
```

Retorna mensagens da tabela `whatsapp_messages` filtradas por `conversation_id`.

### Enviar mensagem manual

```txt
POST /api/inbox/send-message
```

Arquivo:

```txt
app/api/inbox/send-message/route.ts
```

Body:

```json
{
  "conversationId": "uuid_da_conversa",
  "body": "mensagem"
}
```

Fluxo:

1. Busca a conversa no Supabase.
2. Envia mensagem pelo gateway WhatsApp Web.
3. Salva a mensagem enviada em `whatsapp_messages`.
4. Atualiza `last_message_at` e status da conversa.

### Atualizar status da conversa

```txt
PATCH /api/inbox/conversation-status
```

Arquivo:

```txt
app/api/inbox/conversation-status/route.ts
```

Campos aceitos:

```txt
status: open, pending, resolved, archived
stage: novo, qualificacao, proposta, negociacao, cliente, perdido
priority: baixa, normal, alta, urgente
```

### Atualizar contato

```txt
PATCH /api/inbox/contact
```

Arquivo:

```txt
app/api/inbox/contact/route.ts
```

Campos:

```txt
name
email
company
consentStatus
tags
```

### Notas internas

```txt
GET /api/inbox/contact-notes?contactId=<id>
POST /api/inbox/contact-notes
```

Arquivo:

```txt
app/api/inbox/contact-notes/route.ts
```

As notas são salvas em:

```txt
crm_contact_notes
```

### Respostas rápidas

```txt
GET /api/inbox/quick-replies
```

Arquivo:

```txt
app/api/inbox/quick-replies/route.ts
```

Retorna respostas ativas da tabela:

```txt
quick_replies
```

## Migration complementar

Arquivo:

```txt
supabase/migrations/0002_inbox_crm_extensions.sql
```

Adiciona:

```txt
whatsapp_conversations.stage
whatsapp_conversations.priority
whatsapp_conversations.assigned_to
crm_contact_notes
quick_replies
```

## Atenção operacional

Antes de usar o Inbox completo em produção, executar a migration `0002_inbox_crm_extensions.sql` no Supabase.

## Próximas melhorias

Prioridade P2:

1. Criar funil visual.
2. Criar tela de edição de respostas rápidas.
3. Criar busca por contato/conversa.
4. Criar filtros por status, prioridade e etapa.
5. Criar histórico completo do contato.
6. Criar permissões por usuário.
