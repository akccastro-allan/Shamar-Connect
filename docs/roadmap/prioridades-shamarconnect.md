# Roadmap de prioridades do ShamarConnect

Este documento organiza o desenvolvimento por prioridade para evitar perda de foco.

## P0 — Base operacional segura

Objetivo: permitir testes reais com WhatsApp Web sem salvar dados pessoais automaticamente.

### P0.1 — Conexão WhatsApp Web

Status: implementado.

Funções:

- Exibir QR Code na aplicação.
- Atualizar status da conexão.
- Mostrar estado `idle`, `qr`, `authenticated`, `ready`, `disconnected` ou `error`.

Arquivos principais:

```txt
app/settings/whatsapp/page.tsx
components/whatsapp-settings-panel.tsx
app/api/whatsapp-web/status/route.ts
app/api/whatsapp-web/start/route.ts
app/api/whatsapp-web/pairing-code/route.ts
gateway/whatsapp-web/src/server.js
```

### P0.2 — Supabase conectado

Status: implementado.

Funções:

- Conexão pública com Supabase via Publishable Key.
- Conexão de escrita via Service Role Key.
- Health check da conexão.

Arquivos principais:

```txt
lib/supabase/env.ts
lib/supabase/browser.ts
lib/supabase/server.ts
lib/supabase/server-write.ts
app/api/supabase/health/route.ts
```

### P0.3 — Banco inicial do CRM/WhatsApp

Status: implementado.

Tabelas:

```txt
crm_contacts
whatsapp_conversations
whatsapp_messages
whatsapp_groups
group_contact_lists
group_contact_list_items
provider_events
audit_logs
```

Migration:

```txt
supabase/migrations/0001_initial_shamarconnect_schema.sql
```

### P0.4 — Modo seguro de importação

Status: implementado.

Regra principal:

> Nada entra no banco automaticamente durante os testes. Só é salvo aquilo que o usuário selecionar manualmente.

Funções:

- Listar conversas do WhatsApp Web sem salvar no banco.
- Salvar apenas a conversa selecionada.
- Salvar mensagens apenas da conversa selecionada.
- Listar grupos sem salvar no banco.
- Exportar contatos apenas do grupo selecionado.
- Bloquear gravação automática do webhook por padrão.

Arquivos principais:

```txt
components/whatsapp-import-lab-panel.tsx
app/api/whatsapp-web/chats/route.ts
app/api/whatsapp-web/sync-chats/route.ts
app/api/whatsapp-web/sync-chat-messages/route.ts
app/api/whatsapp-web/groups/route.ts
app/api/whatsapp-web/groups/export-contacts/route.ts
app/api/provider-events/whatsapp-web/route.ts
```

## P1 — Leitura e gestão de dados importados

Objetivo: permitir que o usuário veja e revise o que foi salvo.

### P1.1 — Tela de contatos

Status: implementado.

Funções:

- Listar contatos salvos no CRM.
- Mostrar nome, telefone, origem, consentimento, tags e atualização.

Arquivos:

```txt
app/contacts/page.tsx
components/crm/contacts-panel.tsx
app/api/crm/contacts/route.ts
```

### P1.2 — Tela de listas extraídas de grupos

Status: implementado.

Funções:

- Listar exportações de grupos.
- Mostrar participantes totais, contatos únicos e duplicados removidos.

Arquivos:

```txt
app/crm/page.tsx
components/crm/group-contact-lists-panel.tsx
app/api/crm/group-contact-lists/route.ts
```

### P1.3 — Inbox de mensagens salvas

Status: em desenvolvimento.

Funções previstas:

- Listar mensagens já salvas no banco.
- Abrir detalhes de uma conversa.
- Diferenciar mensagens recebidas e enviadas.
- Futuramente permitir resposta manual.

## P2 — CRM comercial

Objetivo: transformar contatos e conversas em operação comercial.

Funções previstas:

1. Criar estágio de funil para contato.
2. Criar tags manuais.
3. Adicionar notas ao contato.
4. Marcar consentimento: `unknown`, `opted_in`, `opted_out`.
5. Revisar lista de grupo antes de campanha.
6. Bloquear campanha para contatos sem permissão.

## P3 — Automação e IA

Objetivo: adicionar inteligência sem perder controle humano.

Funções previstas:

1. Classificar intenção da mensagem.
2. Sugerir resposta.
3. Pontuar lead.
4. Sugerir próxima ação.
5. Criar respostas rápidas.
6. Criar automações condicionais.

## P4 — Integração com API oficial

Objetivo: migrar gradualmente do laboratório WhatsApp Web para WhatsApp Cloud API.

Funções previstas:

1. Mapear provider `whatsapp_web` e `meta_cloud_api`.
2. Criar camada única de envio/recebimento.
3. Integrar webhooks oficiais da Meta.
4. Trabalhar templates aprovados.
5. Separar ambiente experimental de ambiente oficial.

## Regra de ouro do projeto

Antes de implementar nova função:

1. Definir prioridade: P0, P1, P2, P3 ou P4.
2. Criar ou atualizar documentação.
3. Garantir que dados pessoais não sejam salvos sem ação manual do usuário.
4. Validar primeiro no Feature Lab.
5. Só depois mover para tela definitiva.
