# Fila de Atendimento Lips - SLA

## SLAs Iniciais

- Balcao: 20 minutos.
- Oficina: 10 minutos.
- Financeiro: 5 minutos para PIX/pagamento.
- Supervisao: 5 minutos para reclamacao, gerente, responsavel ou caso sensivel.

## Campos

- `queue_entered_at`: entrada na fila humana.
- `assigned_at`: primeiro momento em que um responsavel assume.
- `sla_due_at`: prazo da primeira resposta humana.
- `sla_breached_at`: momento em que o SLA foi considerado vencido.
- `first_human_response_at`: primeira resposta manual do atendente.
- `first_human_response_seconds`: segundos entre entrada na fila e primeira resposta humana.
- `last_human_message_at`: ultima resposta manual.
- `last_customer_message_at`: ultima mensagem recebida do cliente.

## Status De SLA

- `on_time`: dentro do prazo.
- `warning`: proximo do vencimento.
- `breached`: vencido.
- `completed`: primeira resposta humana enviada ou atendimento resolvido.

## Regra Operacional

Resposta automatica nao conta como primeira resposta humana. O SLA so e concluido por resposta manual, resolucao ou fechamento administrativo.

`warning` ocorre quando resta 25% do SLA. No piloto, se nao houver horario comercial cadastrado para a Lips, o SLA e tratado como tempo corrido. O horario de funcionamento deve ser levantado antes do go-live amplo.

Existe a funcao idempotente `mark_lips_sla_breaches(escalate_to_supervision boolean default false)` para marcar vencimentos e preparar escalonamento, mas nenhum worker recorrente deve ser ativado antes da homologacao.
