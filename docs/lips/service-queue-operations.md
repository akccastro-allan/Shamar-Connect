# Fila de Atendimento Lips - Operacao

## Regras De Atendimento

- Grupos nunca recebem resposta automatica.
- Nenhuma IA envia resposta comercial automatica.
- PIX e pagamento sempre vao para Financeiro.
- Reserva e separacao vao para Balcao; nada e reservado automaticamente.
- Reclamacao, gerente ou responsavel vao para Supervisao.
- Resposta humana muda a conversa para `awaiting_customer` e encerra o SLA da primeira resposta.
- Atendente offline ou pausado nao recebe autoatribuicao.

## Fluxo Diario

1. Atendente define disponibilidade: `Disponivel`, `Pausado` ou `Offline`.
2. Supervisor abre `/inbox` e acompanha filtros `Todas`, `Minha fila`, `Nao atribuidas`, `SLA critico`, `Aguardando cliente` e `Resolvidas`.
3. Atendente assume conversas em `waiting` do proprio departamento.
4. Se a conversa estiver no departamento errado, responsavel ou supervisor transfere com motivo.
5. Ao responder manualmente, o sistema registra `last_human_message_at`, `first_human_response_at` e `first_human_response_seconds` quando aplicavel.
6. Ao finalizar, usar `Resolver`; usar `Encerrar conversa` apenas para fechamento administrativo.

## Permissoes

- Admin, owner e supervisor operacional veem toda a fila.
- Atendente ve conversas do proprio departamento, conversas sem departamento e conversas atribuidas a ele.
- Permissao vem de `tenant_users.department_id` e `department_memberships`.

## Incidentes

- Se WhatsApp desconectar, resposta manual retorna erro explicito e a mensagem fica na fila de outbox.
- Se uma conversa cair sem departamento, transferir manualmente e registrar o motivo.
- Se SLA vencer, tratar como prioridade operacional antes de novas conversas normais.
