# WhatsApp Auto Sync - Homologacao

## Pre-condicoes

- Aplicar `0034_lips_service_queue.sql` antes da `0035_whatsapp_auto_sync.sql`.
- Revisar e aplicar `0035_whatsapp_auto_sync.sql` somente apos aprovacao.
- Confirmar secrets: `INTERNAL_API_KEY`, `WHATSAPP_WEB_GATEWAY_URL`, `WHATSAPP_WEB_GATEWAY_TOKEN`.
- Confirmar canal Lips: `session_id = lips-main` e `gateway_id = null`.

## Checklist

1. Conectar `lips-main` no gateway.
2. Confirmar webhook OpenWA apontando para `/api/webhooks/openwa`.
3. Enviar evento `connected/ready` ou reconectar a sessao.
4. Verificar job `bootstrap` em `whatsapp_sync_runs`.
5. Executar `POST /api/internal/whatsapp-sync/process` com `x-internal-api-key`.
6. Confirmar `whatsapp_channel_sync_state.sync_status = ready` ou `degraded`.
7. Abrir `/inbox` e confirmar conversas nao-grupo na fila.
8. Confirmar que grupos nao foram importados para automacao.
9. Enviar uma mensagem real de contato nao-grupo para Lips.
10. Confirmar que webhook cria/atualiza conversa sem refresh manual.
11. Confirmar que a inbox nao exige clique manual para sincronizar.
12. Testar diagnostico tecnico apenas como owner/admin, fora do fluxo normal.

## Nao fazer na homologacao inicial

- Nao copiar SQL manualmente no Dashboard sem revisao.
- Nao rodar backfill sem limites.
- Nao enviar mensagens WhatsApp reais pelo worker.
- Nao alterar IA da Lips.
- Nao renomear `lips-main`.
- Nao liberar grupos para resposta automatica.
- Nao aplicar `0036_whatsapp_sync_scheduler.sql` antes do deployment Production.
