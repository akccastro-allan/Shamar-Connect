# ADR 0002 — Canais oficiais (Meta) e WhatsApp Web no mesmo modelo de canal

Data: 2026-06-21
Status: Aceito

## Contexto

O ShamarConnect vai oferecer WhatsApp **oficial** (Meta Cloud API) além do
WhatsApp Web (whatsapp-web.js), começando por uma clínica médica. Precisamos
suportar múltiplos números/provedores sem misturar mensagens nem refazer o
sistema a cada novo canal (Instagram, Messenger, Telegram, e-mail, SMS no futuro).

O plano inicial propunha uma tabela nova `messaging_channels`. Diagnóstico do
schema real mostrou que **já existe** `public.channels`, já referenciada por
`whatsapp_conversations.channel_id`. Criar outra tabela geraria duas fontes de
verdade e uma migração de relacionamento arriscada.

Também constatamos que `channels` tem RLS `public_read` (a anon key lê todas as
colunas), porque o front lista canais pela anon key.

## Decisão

1. **Estender `public.channels`** com os campos de canal oficial em vez de criar
   `messaging_channels`: `provider`, `channel_type`, `display_name`,
   `phone_number`, `phone_number_id`, `waba_id`, `business_account_id`,
   `status`, `is_default`, `metadata`.
2. **Segredos nunca em `channels`.** Tokens (`access_token`, `verify_token`) ficam
   em `public.channel_credentials` (PK = `channel_id`), com RLS **service_role only**.
   Mesmo padrão de `social_accounts` (Instagram/Messenger).
3. **Adicionar `whatsapp_messages.channel_id`** (conversas já tinham). Mensagens e
   conversas passam a carregar o canal de origem.
4. Providers válidos hoje: `whatsapp_web`, `meta_whatsapp`. Futuro: `instagram`,
   `messenger`, `telegram`, `email`, `sms` (validação na aplicação por enquanto).

Migração: `supabase/migrations/0018_multichannel_channels_fields.sql` (aplicada em produção).

## Consequências

- Reaproveita o relacionamento existente (`channel_id`), sem migrar FKs.
- Tokens isolados e protegidos; a exposição public_read de `channels` não vaza segredo.
- Próximos blocos (webhook Meta, envio, templates, filas) plugam por `channel_id`.
- Pendência conhecida: `channels` ainda expõe identificadores (phone, session_id,
  phone_number_id) à anon key — avaliar restringir leitura pública via view.
