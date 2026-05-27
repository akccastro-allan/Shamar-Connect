# WhatsApp Reader UX — Fase 2

Este documento registra a segunda evolução prática da tela de mensagens do WhatsApp no ShamarConnect.

## Objetivo

Adicionar recursos operacionais mínimos para atendimento:

- respostas rápidas;
- painel lateral do contato/conversa;
- botão para salvar conversa inteira com confirmação.

## Arquivos criados

### Migration de respostas rápidas

```txt
supabase/migrations/0003_quick_replies.sql
```

Cria a tabela:

```txt
quick_replies
```

Campos principais:

```txt
id
title
body
category
is_active
created_at
updated_at
```

Também cria políticas RLS e insere respostas rápidas iniciais.

### API de respostas rápidas

```txt
app/api/quick-replies/route.ts
```

Endpoint:

```txt
GET /api/quick-replies
```

Retorna respostas rápidas ativas.

## Arquivo alterado

```txt
components/whatsapp-reader-panel.tsx
```

## Melhorias implementadas

### 1. Respostas rápidas

A tela agora carrega respostas rápidas da API:

```txt
GET /api/quick-replies
```

As respostas aparecem acima do campo de digitação.

Ao clicar em uma resposta rápida, o texto é colocado no campo de resposta.

Respostas iniciais criadas:

- Saudação inicial
- Retorno em breve
- Pedir mais detalhes
- Encaminhar para atendimento
- Agradecimento

### 2. Painel lateral do contato/conversa

Foi adicionado um painel lateral com:

- nome da conversa;
- tipo: privado ou grupo;
- telefone/ID;
- última mensagem recebida carregada;
- aviso de segurança sobre salvamento manual.

### 3. Salvar conversa inteira

Foi adicionado botão:

```txt
Salvar conversa
```

Antes de salvar, o sistema pede confirmação com `window.confirm`.

Se confirmado, todas as mensagens carregadas da conversa atual são enviadas para o endpoint existente:

```txt
POST /api/whatsapp-web/messages/save-selected
```

### 4. Salvamento mantido com controle manual

A tela continua não salvando automaticamente mensagens apenas por terem sido lidas.

O usuário pode salvar:

- mensagens selecionadas;
- conversa inteira carregada, com confirmação.

## Próximos passos recomendados

1. Rodar a migration `0003_quick_replies.sql` no Supabase.
2. Criar tela CRUD para cadastrar respostas rápidas.
3. Criar variáveis nas respostas rápidas, como `{nome}`.
4. Criar painel lateral real do CRM com edição do contato.
5. Criar notas internas da conversa.
6. Criar botão para vincular conversa a oportunidade no funil.
7. Criar indicador visual do status do gateway dentro da tela.
