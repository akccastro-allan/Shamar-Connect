# WhatsApp Reader UX — Fase 3

Este documento registra a terceira evolução prática da tela de mensagens do WhatsApp no ShamarConnect.

## Objetivo

Avançar a tela `/whatsapp-messages` com recursos de atendimento e operação:

- gestão básica de respostas rápidas;
- variáveis em respostas rápidas;
- status do gateway WhatsApp dentro da tela;
- notas internas por conversa;
- documentação do SQL necessário.

## Arquivos criados

### Migration de notas internas

```txt
supabase/migrations/0004_conversation_notes.sql
```

Cria a tabela:

```txt
conversation_notes
```

Campos principais:

```txt
id
provider
external_chat_id
note
created_by
created_at
```

### API de notas internas

```txt
app/api/chat-notes/route.ts
```

Endpoints:

```txt
GET /api/chat-notes?externalChatId=CHAT_ID
POST /api/chat-notes
```

### Painel de gestão de respostas rápidas

```txt
components/quick-replies-manager-panel.tsx
```

Permite:

- listar respostas rápidas;
- criar nova resposta rápida;
- ativar/desativar resposta rápida.

### Página de gestão de respostas rápidas

```txt
app/quick-replies/page.tsx
```

Rota:

```txt
/quick-replies
```

## Arquivos alterados

### API de respostas rápidas

```txt
app/api/quick-replies/route.ts
```

Antes tinha apenas leitura.

Agora possui:

```txt
GET
POST
PATCH
```

### Tela de mensagens WhatsApp

```txt
components/whatsapp-reader-panel.tsx
```

Melhorias adicionadas:

- status do gateway no topo;
- exibição de erro do gateway;
- respostas rápidas com variáveis;
- painel lateral com notas internas;
- carregamento de notas por conversa;
- criação de notas internas;
- melhoria no painel de contato/conversa.

## Variáveis em respostas rápidas

A tela já processa as variáveis:

```txt
{nome}
{telefone}
```

Exemplo de resposta rápida:

```txt
Olá, {nome}! Tudo bem? Como posso te ajudar hoje?
```

Se a conversa tiver nome disponível, `{nome}` será substituído pelo primeiro nome.

Se tiver telefone identificado, `{telefone}` será substituído pelo número.

## Status do gateway

A tela chama:

```txt
GET /api/whatsapp-web/status
```

E exibe o status no topo da página.

Exemplos possíveis:

```txt
ready
qr
authenticated
disconnected
error
```

## Notas internas

As notas internas são vinculadas ao `external_chat_id` da conversa do WhatsApp Web.

Elas não são enviadas ao cliente.

Servem para registrar contexto de atendimento, observações comerciais, alinhamentos internos e próximos passos.

## SQL necessário

Rodar no Supabase:

```sql
create table if not exists public.conversation_notes (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'whatsapp_web',
  external_chat_id text not null,
  note text not null,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_conversation_notes_external_chat_id
  on public.conversation_notes(external_chat_id);

alter table public.conversation_notes enable row level security;

drop policy if exists "public_read_conversation_notes" on public.conversation_notes;
create policy "public_read_conversation_notes" on public.conversation_notes for select using (true);

drop policy if exists "service_all_conversation_notes" on public.conversation_notes;
create policy "service_all_conversation_notes" on public.conversation_notes
for all using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
```

## Próximos passos recomendados

1. Criar edição de respostas rápidas existentes.
2. Criar categorias filtráveis para respostas rápidas.
3. Criar notas internas com autor real quando houver autenticação.
4. Criar painel CRM editável ao lado da conversa.
5. Criar tarefas/follow-up por conversa.
6. Criar vínculo com oportunidade no funil.
7. Criar suporte inicial para mídia e anexos.
