# Workflow de Distribuição de Conteúdo

Central de Distribuição — como usar no dia a dia.

---

## Regra fundamental

> **Grupos e canais informativos = broadcast. Nunca atendimento.**
> Atendimento só em DM, WhatsApp individual, Telegram privado, Instagram DM.

---

## Como criar uma divulgação

1. Acesse **Central de Distribuição** (`/distribution`)
2. Clique em **Nova divulgação**
3. Preencha:
   - **Título interno**: apenas para organização interna
   - **Tipo**: Artigo / Evento / Manual
   - **Título do conteúdo**: título real do artigo ou evento
   - **URL**: link do site (ex: viciadosemtrilhas.com.br/...)
   - Clique em **Gerar automaticamente** — o sistema monta a mensagem com o template padrão
   - Revise e ajuste o texto se necessário
4. Selecione os **canais destino**
5. Clique em **Salvar rascunho**

---

## Como publicar no Telegram

Pré-requisito: `TELEGRAM_BOT_TOKEN` configurado e bot adicionado ao canal/grupo como administrador.

1. Abra a divulgação na lista
2. Clique em **Publicar no Telegram**
3. O sistema envia para todos os canais Telegram pendentes
4. O status de cada target muda para `published`

### Configurar o bot no canal

1. Crie o bot via [@BotFather](https://t.me/BotFather) → `/newbot`
2. Copie o token para a env var `TELEGRAM_BOT_TOKEN`
3. Adicione o bot ao canal/grupo como **Administrador** com permissão de postar mensagens
4. Cadastre o canal em **Canais de Distribuição** com:
   - Provider: `telegram_channel` ou `telegram_group`
   - External ID: ID numérico do canal (ex: `-1001234567890`) ou `@username` do canal público

Para descobrir o ID do canal: encaminhe uma mensagem para @userinfobot no Telegram.

---

## Como copiar para WhatsApp informativo

Envio automático para grupos WhatsApp **não está ativo** — por segurança, é feito manualmente.

1. Na divulgação, clique em **Copiar mensagem**
2. Cole no grupo do WhatsApp

> A publicação automática em grupos WhatsApp será ativada após validação de segurança completa.

---

## Como NÃO confundir grupo com atendimento

| Situação | Canal correto |
|----------|---------------|
| Publicar artigo novo | Central de Distribuição → grupo informativo |
| Cliente pergunta sobre preço | WhatsApp individual / DM |
| Divulgar data de evento | Central de Distribuição → canal Telegram |
| Cliente reclama de produto | WhatsApp individual / DM |
| Notícia de última hora | Central de Distribuição |
| Responder dúvida específica | Nunca no grupo — abrir DM |

---

## Como lidar com DMs do Instagram

1. DM chega no perfil Instagram
2. Abrir o perfil profissional no Instagram ou no Meta Business Suite
3. Responder manualmente
4. (Futuramente) DMs aparecerão em `/social-inbox` após integração oficial

Veja: [docs/instagram-dm-integration.md](instagram-dm-integration.md)

---

## O que será implementado depois

- [ ] Publicação automática em grupos WhatsApp (após validação de segurança)
- [ ] Instagram DM via Meta Messaging API (após aprovação de permissões)
- [ ] Telegram privado na fila do Social Inbox
- [ ] Agendamento de divulgações (campo `scheduled_at` já existe no DB)
- [ ] Aprovação de rascunho antes de publicar (status `ready`)
- [ ] Histórico de publicações com link direto para mensagem no Telegram
- [ ] Preview de como a mensagem vai aparecer em cada canal

---

## Templates de mensagem

Os templates são gerados automaticamente por `lib/distribution/content-message-builder.ts`.

**Artigo:**
```
🌿 Novo conteúdo no blog dos Viciados em Trilhas!

[TÍTULO]

Preparamos esse artigo para te ajudar a viver melhor suas próximas aventuras.

Leia aqui:
[URL]

Saímos juntos e voltamos juntos.
Viciados em Trilhas.
```

**Evento:**
```
🥾 Próxima aventura dos Viciados em Trilhas!

[TÍTULO]
📅 Data: [DATA]
📍 Local: [LOCAL]

Confira detalhes, vagas e orientações pelo link:
[URL]

Saímos juntos e voltamos juntos.
Viciados em Trilhas.
```

Para personalizar os templates, edite `lib/distribution/content-message-builder.ts`.
