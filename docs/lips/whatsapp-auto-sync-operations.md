# WhatsApp Auto Sync - Operacao

## Migration

A migration local e `supabase/migrations/0035_whatsapp_auto_sync.sql`.

Ela ainda deve ser revisada antes de aplicar em homologacao/producao.

## Worker

Endpoint interno:

```bash
POST /api/internal/whatsapp-sync/process
x-internal-api-key: $INTERNAL_API_KEY
```

Body opcional:

```json
{ "maxRuns": 1 }
```

Recomendacao inicial para homologacao: chamar manualmente com `maxRuns: 1`. Scheduler automatico so depois do deploy Production.

## Enqueue automatico

Quando o webhook OpenWA recebe evento de sessao `connected/ready`, o sistema cria:

- `bootstrap` se o canal ainda nao tem `bootstrap_completed_at`.
- `incremental` se o bootstrap ja foi concluido.

## Diagnostico tecnico

Rotas que antes importavam direto agora enfileiram `manual_diagnostic`:

- `POST /api/whatsapp-web/sync-chat-messages`
- `POST /api/whatsapp-web/sync-chats`
- `POST /api/whatsapp-web/chats/import-history`

Elas exigem `channelId` do canal do tenant/organizacao autenticados.

Elas sao restritas a owner/admin e nao aparecem como acao operacional da inbox comum.

## Reconciliacao

No inicio do worker, canais Lips `whatsapp_web` conectados e atrasados podem receber job `reconciliation` idempotente. Canal offline nao busca chats ou mensagens; apenas atualiza estado para indicar desconexao e tenta novamente depois.

## Status

Status autenticado:

```bash
GET /api/whatsapp-web/sync-status?channelId=<uuid>
```

Status visiveis: `ready`, `syncing`, `stale`, `disconnected`.

## Alertas

- `failed`: revisar `last_error` em `whatsapp_channel_sync_state` e `error_message` em `whatsapp_sync_runs`.
- `degraded`: houve sync parcial; verificar `diagnostics.errors` no run.
- Job parado em `running`: conferir worker/cron e `lock_expires_at`.

## Scheduler futuro

`supabase/migrations/0036_whatsapp_sync_scheduler.sql` foi preparada para Production, mas nao deve ser aplicada antes de:

1. merge em `main` aprovado;
2. deployment Production concluido;
3. `INTERNAL_API_KEY` configurada em Vercel Production;
4. URL e chave armazenadas no Supabase Vault.
