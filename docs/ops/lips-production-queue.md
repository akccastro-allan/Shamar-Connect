# Fila de Atendimento Lips

## Objetivo

Colocar o WhatsApp real da Lips em produção com fila humana supervisionada, sem IA enviando mensagem e sem promover o agente comercial para `copilot`.

## Departamentos

- Balcão: cotação, produto, compra, disponibilidade, alternativas, condição comercial e fechamento humano. SLA inicial: 20 minutos.
- Oficina: serviços, troca de óleo, instalação, manutenção, diagnóstico e agendamento. SLA inicial: 10 minutos.
- Supervisão: pagamento, PIX, reserva, separação, reclamação, responsável, caso sensível, assunto não identificado e SLA vencido. SLA imediato.

## Estados Oficiais

- `new`: mensagem recém-recebida, ainda não triada.
- `queued`: esperando alguém assumir.
- `assigned`: responsável definido, atendimento ainda não iniciado.
- `in_progress`: atendimento humano em andamento.
- `awaiting_customer`: equipe respondeu e aguarda cliente.
- `pending_internal`: depende de estoque, preço, supervisor ou oficina.
- `resolved`: demanda concluída.
- `closed`: encerramento administrativo definitivo.

## Roteamento

A função central é `lib/queues/lips-routing.ts`.

- `tem pastilha?`: Balcão normal quando automação segura pode pedir dados.
- `quero sim`: Balcão, prioridade alta, SLA 20 minutos.
- `manda pix`: Supervisão, urgente, SLA imediato.
- `separa essa`: Supervisão, urgente, sem reserva automática.
- `quero trocar óleo`: Oficina, prioridade alta, SLA 10 minutos.
- `quero falar com o gerente`: Supervisão, urgente.
- humano exigido sem intenção identificada: Supervisão.

## Automação

Automação pode responder cotação segura e perguntas de qualificação. Quando houver handoff, a conversa entra na fila e `requires_human=true` permanece até resposta humana ou resolução.

Resposta automática não conta como primeira resposta humana.

## Atribuição

`POST /api/conversations/:id/claim` usa update condicional: somente conversa sem `assigned_to` e status `new`, `queued` ou `assigned` pode ser assumida. Em disputa, apenas uma atualização vence.

## Transferência

`POST /api/conversations/:id/transfer` exige motivo curto e preserva histórico em `whatsapp_conversation_events`.

## SLA

Campos usados:

- `sla_started_at`
- `sla_due_at`
- `sla_status`
- `first_human_response_at`

Status:

- `on_time`
- `warning`
- `breached`
- `completed`

## Auditoria

Eventos registrados em `whatsapp_conversation_events`:

- `conversation_received`
- `automation_replied`
- `handoff_requested`
- `queued`
- `assigned`
- `transferred`
- `human_replied`
- `awaiting_customer`
- `pending_internal`
- `sla_warning`
- `sla_breached`
- `resolved`
- `reopened`
- `closed`

Metadata não deve conter secrets, tokens ou mensagem completa.

## Produção Assistida

Dia 1: número real conectado, automação segura ativa, handoffs supervisionados e supervisor acompanhando a fila.

Primeiros 7 dias: registrar mensagens recebidas, intenções erradas, SLA, tempo de resposta, transferências, abandonos, falhas e vendas geradas.

## Proibições

- Não ativar IA automática.
- Não promover para `copilot`.
- Não responder grupos automaticamente.
- Não enviar PIX, reserva, retirada ou agenda por automação.
- Não alterar `lips-main` sem validação operacional.
