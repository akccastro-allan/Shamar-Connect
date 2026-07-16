# Fluxos de conversa

Este documento registra a primeira implementação dos fluxos de conversa no ShamarConnect.

## Objetivo

Criar sequências manuais/semi-automáticas de atendimento para aplicar na Central WhatsApp.

A primeira versão não dispara mensagens automaticamente. Ela permite selecionar etapas de um fluxo e aplicar o texto no campo de resposta para revisão antes do envio.

## Migration criada

```txt
supabase/migrations/0033_conversation_flows.sql
```

## Tabelas criadas

### conversation_flows

Armazena o fluxo principal.

Campos principais:

```txt
id
name
description
trigger_type
status
tags
created_at
updated_at
```

Status permitidos:

```txt
draft
active
paused
archived
```

Tipos de gatilho planejados:

```txt
manual
keyword
new_contact
follow_up
```

### conversation_flow_steps

Armazena as etapas do fluxo.

Campos principais:

```txt
id
flow_id
step_order
title
message_body
wait_minutes
step_type
quick_reply_id
created_at
updated_at
```

Tipos de etapa:

```txt
message
question
follow_up
```

### conversation_flow_sessions

Armazena uma sessão de fluxo iniciada para uma conversa.

Campos principais:

```txt
id
flow_id
conversation_id
contact_id
current_step_order
status
started_at
completed_at
last_sent_at
metadata
```

Status permitidos:

```txt
active
paused
completed
cancelled
```

## APIs criadas

### Listar fluxos

```txt
GET /api/conversation-flows
```

Retorna fluxos com suas etapas.

### Criar fluxo

```txt
POST /api/conversation-flows
```

Payload:

```json
{
  "name": "Atendimento inicial",
  "description": "Fluxo para qualificar contato",
  "firstMessage": "Olá! Tudo bem? Como posso te ajudar?"
}
```

### Atualizar/arquivar fluxo

```txt
PATCH /api/conversation-flows
```

Payload:

```json
{
  "id": "uuid-do-fluxo",
  "status": "archived"
}
```

### Criar etapa

```txt
POST /api/conversation-flows/[flowId]/steps
```

Payload:

```json
{
  "title": "Qualificação",
  "messageBody": "Pode me passar mais detalhes?",
  "stepOrder": 2,
  "waitMinutes": 0,
  "stepType": "question"
}
```

### Iniciar sessão de fluxo

```txt
POST /api/conversation-flows/[flowId]/start
```

Payload:

```json
{
  "conversationId": "uuid-da-conversa",
  "contactId": "uuid-do-contato",
  "metadata": {
    "appliedFrom": "whatsapp_service_center"
  }
}
```

## Tela criada

```txt
/conversation-flows
```

Componente:

```txt
components/conversation-flows-manager.tsx
```

Permite:

- listar fluxos;
- criar fluxo;
- adicionar etapas;
- arquivar fluxo;
- visualizar mensagens por etapa.

## Integração com Central WhatsApp

Arquivo atualizado:

```txt
components/whatsapp-service-center.tsx
```

A Central WhatsApp agora permite:

- carregar fluxos ativos;
- buscar fluxos;
- aplicar uma etapa do fluxo no campo de resposta;
- personalizar variáveis simples:
  - `{nome}`
  - `{telefone}`
  - `{empresa}`
- iniciar uma sessão de fluxo para a conversa selecionada.

## Regra operacional

Fluxos não enviam mensagens automaticamente nesta primeira versão.

O fluxo apenas preenche o campo de resposta. O atendente revisa e clica em `Enviar mensagem`.

## Próximas evoluções

1. Avançar sessão para próxima etapa.
2. Marcar etapa como enviada.
3. Enviar etapa diretamente com confirmação.
4. Criar gatilhos por palavra-chave.
5. Criar follow-up programado.
6. Integrar com automações.
7. Adicionar condições simples, como resposta recebida ou sem resposta.
8. Criar relatórios por fluxo.
