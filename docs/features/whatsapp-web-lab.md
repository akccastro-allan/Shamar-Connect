# WhatsApp Web Lab — funcionamento estilo WaSeller

Este documento descreve as funções do laboratório WhatsApp Web do ShamarConnect.

## Objetivo

Criar um fluxo operacional parecido com ferramentas comerciais de WhatsApp CRM, mantendo controle manual e segurança durante a fase de testes.

## Princípio de segurança

Durante o ambiente de teste:

```txt
Nada é salvo automaticamente no banco.
```

A plataforma pode listar dados visíveis no WhatsApp Web, mas só grava no Supabase depois de uma ação manual do usuário.

## Fluxos implementados

## 1. Listar conversas

Endpoint:

```txt
GET /api/whatsapp-web/chats
```

O que faz:

- Busca conversas visíveis no WhatsApp Web conectado.
- Retorna lista para a interface.
- Não grava nada no Supabase.

## 2. Salvar conversa selecionada

Endpoint:

```txt
POST /api/whatsapp-web/sync-chats
```

Body esperado:

```json
{
  "chatIds": ["id_da_conversa"]
}
```

O que faz:

- Recebe somente os IDs escolhidos.
- Salva apenas essas conversas em `whatsapp_conversations`.
- Rejeita requisições sem seleção.

## 3. Salvar mensagens da conversa selecionada

Endpoint:

```txt
POST /api/whatsapp-web/sync-chat-messages
```

Body esperado:

```json
{
  "chatId": "id_da_conversa",
  "limit": 50
}
```

O que faz:

- Busca as últimas mensagens da conversa escolhida no gateway WhatsApp Web.
- Salva contatos relacionados em `crm_contacts`.
- Salva a conversa em `whatsapp_conversations`.
- Salva mensagens em `whatsapp_messages`.
- Não busca nem salva mensagens de outras conversas.

## 4. Listar grupos

Endpoint:

```txt
GET /api/whatsapp-web/groups
```

O que faz:

- Lista grupos visíveis no WhatsApp Web conectado.
- Não grava nada no Supabase.

## 5. Exportar contatos do grupo selecionado

Endpoint:

```txt
POST /api/whatsapp-web/groups/export-contacts
```

Body esperado:

```json
{
  "groupId": "id_do_grupo",
  "groupName": "Nome do grupo"
}
```

O que faz:

- Busca participantes apenas do grupo escolhido.
- Remove duplicados.
- Salva grupo em `whatsapp_groups`.
- Cria lista em `group_contact_lists`.
- Salva itens em `group_contact_list_items`.
- Salva contatos em `crm_contacts`.

## 6. Webhook de eventos do gateway

Endpoint:

```txt
POST /api/provider-events/whatsapp-web
```

O que faz por padrão:

- Salva eventos brutos em `provider_events`.
- Não salva mensagens automaticamente em `whatsapp_messages`.

Para ativar gravação automática de mensagens recebidas, seria necessário definir:

```env
WHATSAPP_AUTO_SAVE_INCOMING_MESSAGES=true
```

Durante o teste, esta variável deve ficar ausente ou diferente de `true`.

## Interface principal

Tela:

```txt
/feature-lab
```

Componente:

```txt
components/whatsapp-import-lab-panel.tsx
```

Funções disponíveis:

- Listar conversas.
- Salvar conversa selecionada.
- Salvar mensagens da conversa selecionada.
- Listar grupos.
- Exportar grupo selecionado.

## Tabelas usadas

```txt
crm_contacts
whatsapp_conversations
whatsapp_messages
whatsapp_groups
group_contact_lists
group_contact_list_items
provider_events
```

## Regras para evolução

1. Primeiro testar no Feature Lab.
2. Não salvar dados em massa sem confirmação.
3. Não ativar campanhas automáticas para contatos com `consent_status = unknown`.
4. Toda importação deve gerar lista revisável.
5. Toda nova função deve ser documentada neste arquivo ou em arquivo específico dentro de `docs/features`.
