# Fila de Atendimento Lips - Homologacao

## Antes De Homologar

- Confirmar `OPENWA_WEBHOOK_SECRET` na Vercel e no Railway.
- Confirmar webhook ativo no gateway.
- Confirmar sessao `lips-main` conectada.
- Confirmar membros reais em Balcao, Oficina, Financeiro e Supervisao.
- Nao preencher `gateway_id` da Lips nesta sprint.

## Roteiro Obrigatorio

- Mensagem `tem pastilha?`: Balcao, prioridade `normal` quando automacao segura puder qualificar.
- Mensagem `quero sim`: Balcao, prioridade `high`, SLA 20 minutos.
- Mensagem `manda pix`: Financeiro, prioridade `urgent`, SLA imediato.
- Mensagem `separa essa`: Balcao, prioridade `urgent`, sem reserva automatica.
- Mensagem `quero trocar oleo`: Oficina, prioridade `high`, SLA 10 minutos.
- Mensagem `quero falar com o gerente`: Supervisao, prioridade `urgent`.
- Grupo WhatsApp: ignorado para resposta automatica.

## Validacao Tecnica

- `npx tsc --noEmit --pretty false`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm audit`
- `git diff --check`

## Saida Esperada

- Conversas aparecem em `/inbox` com `queue_status` oficial.
- Claim concorrente permite apenas um responsavel.
- Transferencia registra evento com motivo.
- Resposta humana encerra SLA e atualiza historico.
- Reabertura volta para `waiting` sem responsavel no MVP.
