# Respostas rápidas

Este documento registra a implementação do módulo de respostas rápidas do ShamarConnect.

## Objetivo

Permitir que a equipe cadastre mensagens reutilizáveis e aplique essas respostas diretamente na Central de Atendimento WhatsApp.

## Tabela criada

Migration:

```txt
supabase/migrations/0003_quick_replies.sql
```

Tabela:

```txt
quick_replies
```

Campos principais:

```txt
id
title
body
category
tags
usage_count
is_active
created_at
updated_at
```

## APIs criadas/atualizadas

### Listar respostas rápidas

```txt
GET /api/quick-replies
```

Retorna respostas ativas.

### Criar resposta rápida

```txt
POST /api/quick-replies
```

Payload:

```json
{
  "title": "Saudação inicial",
  "category": "atendimento",
  "body": "Olá! Tudo bem? Como posso te ajudar hoje?",
  "tags": ["inicio", "atendimento"]
}
```

### Atualizar/arquivar resposta rápida

```txt
PATCH /api/quick-replies
```

Payload:

```json
{
  "id": "uuid-da-resposta",
  "is_active": false
}
```

### Registrar uso

```txt
POST /api/quick-replies/use
```

Payload:

```json
{
  "id": "uuid-da-resposta"
}
```

Incrementa `usage_count`.

## Tela de gerenciamento

Página:

```txt
/quick-replies
```

Componente:

```txt
components/quick-replies-manager.tsx
```

Permite:

- listar respostas rápidas;
- buscar por título, categoria, corpo ou tags;
- criar nova resposta;
- arquivar resposta;
- ver quantidade de usos.

## Integração com Central WhatsApp

Arquivo atualizado:

```txt
components/whatsapp-service-center.tsx
```

A Central WhatsApp agora:

- carrega respostas rápidas ativas;
- permite buscar respostas rápidas;
- permite aplicar a resposta no campo de mensagem;
- registra o uso da resposta rápida;
- mantém o envio manual pela central.

## Observações

A resposta rápida não envia automaticamente. Ela apenas preenche o campo de resposta. O atendente ainda precisa revisar e clicar em `Enviar mensagem`.

## Próximas evoluções

1. Variáveis dinâmicas, como `{nome}` e `{empresa}`.
2. Categorias editáveis.
3. Permissões por usuário.
4. Respostas rápidas por etapa do funil.
5. Sugestão automática de resposta rápida pela IA.
6. Métricas de uso por atendente.
