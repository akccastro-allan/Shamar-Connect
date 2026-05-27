# WhatsApp Import Lab

Este documento registra a implementação inicial do módulo de importação estilo WaSeller no ShamarConnect.

## Objetivo

Criar uma área experimental para trabalhar com dados que já aparecem no WhatsApp Web conectado, antes da integração definitiva com a API oficial da Meta.

O módulo permite:

1. Sincronizar conversas visíveis no WhatsApp Web.
2. Salvar histórico selecionado de uma conversa na base Supabase.
3. Listar grupos do WhatsApp Web conectado.
4. Exportar participantes de grupos.
5. Salvar contatos extraídos no CRM.
6. Criar uma lista rascunho para revisão antes de campanhas.

## Página criada

```txt
/whatsapp-import
```

Arquivo:

```txt
app/whatsapp-import/page.tsx
```

Componente principal:

```txt
components/whatsapp-import-panel.tsx
```

## Navegação

A página foi adicionada ao menu lateral em:

```txt
components/app-shell.tsx
```

Label:

```txt
Importação WhatsApp
```

## Endpoints da Vercel

### Listar chats

```txt
GET /api/whatsapp-web/chats
```

Busca no gateway os chats disponíveis no WhatsApp Web conectado.

### Sincronizar conversas

```txt
POST /api/whatsapp-web/sync-chats
```

Salva os chats visíveis em:

```txt
whatsapp_conversations
```

### Importar histórico de uma conversa

```txt
POST /api/whatsapp-web/chats/import-history
```

Payload esperado:

```json
{
  "chatId": "id-da-conversa",
  "limit": 50
}
```

Salva dados em:

```txt
crm_contacts
whatsapp_conversations
whatsapp_messages
```

### Listar grupos

```txt
GET /api/whatsapp-web/groups
```

Busca no gateway os grupos disponíveis no WhatsApp Web conectado.

### Exportar contatos de grupo

```txt
POST /api/whatsapp-web/groups/export-contacts
```

Payload esperado:

```json
{
  "groupId": "id-do-grupo",
  "groupName": "Nome do grupo"
}
```

Salva dados em:

```txt
whatsapp_groups
group_contact_lists
group_contact_list_items
crm_contacts
```

## Endpoints do Railway Gateway

O gateway já possui suporte para:

```txt
GET /chats
GET /groups
GET /groups/:groupId/participants
GET /chats/:chatId/messages
```

O endpoint `/chats/:chatId/messages` permite buscar histórico recente de uma conversa usando `chat.fetchMessages` do WhatsApp Web.

## Comportamento de segurança

A importação de contatos de grupos cria lista com status:

```txt
draft
```

Isso significa que os contatos entram como rascunho para revisão antes de qualquer campanha em massa.

Os contatos são salvos com:

```txt
consent_status = unknown
```

Essa decisão evita tratar participantes de grupo como leads com opt-in automático.

## Próximas evoluções

1. Criar tela para visualizar listas importadas.
2. Criar botão para aprovar/reprovar contatos da lista.
3. Criar exportação CSV real.
4. Criar filtros por grupo, data, status e origem.
5. Criar envio individual contextual a partir da conversa.
6. Criar política de opt-in antes de campanhas em massa.
7. Evoluir o fluxo para a API oficial da Meta quando estiver disponível.

## Observação

Este módulo é experimental e depende do WhatsApp Web estar conectado e com status `ready` no gateway Railway.
