# WhatsApp Auto Sync - Arquitetura

## Objetivo

Sincronizar o WhatsApp Web da Lips com a inbox/fila existente sem criar inbox paralela e sem depender do navegador aberto.

## Camadas

1. Webhook em tempo real: mensagens recebidas continuam entrando por `app/api/webhooks/openwa/route.ts` e usando `ingestInboundMessage`.
2. Bootstrap automatico: evento de sessao `connected/ready` enfileira um job `bootstrap` se o canal ainda nao tem `bootstrap_completed_at`.
3. Incremental/reconciliacao: jobs posteriores usam os mesmos limites e gravam estado em `whatsapp_channel_sync_state` e `whatsapp_sync_runs`.
4. Diagnostico tecnico: rotas restritas a owner/admin criam job `manual_diagnostic`; nao importam historico dentro da request do usuario e nao sao necessarias para a operacao normal.

## Tabelas

- `whatsapp_channel_sync_state`: estado operacional por `channel_id`.
- `whatsapp_sync_runs`: jobs/runs de sync com contadores, erros e status.

As tabelas ficam com RLS ligado e acesso apenas por `service_role`. Nao armazenam API key, token, cookie, QR ou segredo.

## Limites

- Bootstrap/reconciliacao: maximo 100 chats recentes.
- Mensagens por chat: maximo 100.
- Bootstrap/reconciliacao: maximo ultimos 30 dias.
- Grupos: ignorados pela sync.

## Idempotencia

- Conversa: `channel_id + external_chat_id`.
- Mensagem: `channel_id + external_message_id`.
- Fallback de mensagem sem ID: hash de `conversation_id`, direcao, corpo e timestamp aproximado.

## Fila Lips

A sync nao sobrescreve campos operacionais de conversas existentes: `queue_status`, atendente, departamento, prioridade, notas internas, tags e SLA.

Para conversa nova nao-grupo criada a partir de mensagem inbound, a fila inicia como `waiting` para aparecer na inbox.

## Estados de run

- `queued`: aguardando worker.
- `running`: lock adquirido.
- `partial`: limite de execucao atingido ou erro parcial; uma continuacao pode ficar `queued`.
- `completed`: checkpoint salvo e execucao concluida.
- `failed`: erro controlado.
- `skipped`: canal offline, nao aplicavel ou job equivalente ja cobre a janela.
