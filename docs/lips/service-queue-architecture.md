# Fila de Atendimento Lips - Arquitetura

## Objetivo

Operar o WhatsApp real da Lips com triagem segura, fila humana, SLA e auditoria. A IA comercial permanece em modo `observer`; resposta automática só segue o fluxo determinístico seguro da Gabi.

## Estado Operacional

Campos principais em `whatsapp_conversations`:

- `queue_status`: `waiting`, `in_progress`, `awaiting_customer`, `resolved`, `closed`.
- `priority`: `low`, `normal`, `high`, `urgent`.
- `requires_human`, `handoff_reason`, `department_id`, `assigned_user_id`, `assigned_at`.
- `queue_entered_at`, `assigned_at`, `first_human_response_at`, `first_human_response_seconds`.
- `sla_due_at`, `sla_breached_at`, `resolved_at`, `closed_at`.
- `last_human_message_at`, `last_customer_message_at`.

## Departamentos

- Balcao: cotacao, produto, compra, reserva e separacao.
- Oficina: servicos, instalacao, manutencao, troca de oleo e agendamento.
- Financeiro: PIX, pagamento, boleto, cartao, comprovante, cobranca e problema de pagamento.
- Supervisao: reclamacao, gerente, responsavel e caso nao identificado que exija humano.

## APIs

- `GET /api/inbox/queue`: lista conversas por fila e permissao de departamento.
- `GET /api/inbox/queue/metrics`: metricas operacionais do dia.
- `POST /api/inbox/conversations/:id/claim`: assume conversa em `waiting` sem responsavel.
- `POST /api/inbox/conversations/:id/transfer`: transfere departamento/responsavel com motivo.
- `POST /api/inbox/conversations/:id/status`: muda `queue_status`.
- `POST /api/inbox/conversations/:id/resolve`: resolve atendimento.
- `POST /api/inbox/conversations/:id/reopen`: reabre `resolved`; restaura responsavel anterior apenas se estiver disponivel dentro de 72 horas.
- `GET/PATCH /api/inbox/availability`: consulta e altera disponibilidade do atendente.

## Transicoes Oficiais

- `waiting -> in_progress`
- `in_progress -> awaiting_customer`
- `awaiting_customer -> in_progress`
- `in_progress -> resolved`
- `awaiting_customer -> resolved`
- `resolved -> waiting`
- `resolved -> in_progress`, quando reatribuida com seguranca
- `resolved -> closed`, somente supervisor/owner/admin

Bloqueios principais: `waiting -> closed` por agente, `closed -> in_progress` automatico, `resolved -> awaiting_customer` e `waiting -> awaiting_customer`.

## Disponibilidade

- `available`: aceita novas conversas.
- `paused`: usuario segue logado, mas nao recebe autoatribuicao.
- `offline`: nao recebe autoatribuicao.

Toda mudanca gera registro em `agent_availability_events`.

## Auditoria

Eventos ficam em `whatsapp_conversation_events`. Metadata nao deve conter token, secret ou payload sensivel completo.
