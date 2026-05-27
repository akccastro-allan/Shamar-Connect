# P1.3 — Inbox

Status: implementado.

## Objetivo

Permitir a leitura das conversas e mensagens que foram salvas manualmente no Supabase a partir do WhatsApp Web Lab.

## Regra de segurança

O Inbox não puxa conversas diretamente do aparelho e não salva nada automaticamente.

Ele exibe somente dados já gravados nas tabelas:

```txt
whatsapp_conversations
whatsapp_messages
crm_contacts
```

## Fluxo correto de uso

1. Acessar `/feature-lab`.
2. Clicar em `Listar conversas`.
3. Selecionar uma conversa.
4. Clicar em `Salvar conversa selecionada`.
5. Clicar em `Salvar mensagens da conversa selecionada`.
6. Acessar `/inbox`.
7. Selecionar a conversa salva para ler as mensagens.

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
- Diferenciar mensagens recebidas e enviadas.
- Mostrar aviso de modo seguro.
- Atualizar manualmente.

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

## Próximas melhorias

Prioridade P2:

1. Responder mensagem manualmente pelo Inbox.
2. Criar nota no contato.
3. Mover contato para etapa de funil.
4. Alterar consentimento do contato.
5. Aplicar tag manual.
6. Ver histórico completo do contato.
