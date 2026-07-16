# Homologação interna do WhatsApp Sync

Rota interna: `/admin/diagnostics/whatsapp-sync`.

Uso permitido somente para operador interno da plataforma com:

- `tenant.is_platform = true`
- `role = owner` ou `admin`
- `tenant_users.organization_id = null`
- feature `command_center = true`

A ferramenta é invisível para clientes e não autoriza por e-mail ou domínio.

## Escopo

O escopo inicial é fixo:

- empresa: Lips
- `session_id = lips-main`
- provider server-side: OpenWA
- canal resolvido pelo banco

O browser não envia `tenant_id`, `organization_id`, gateway URL, provider token nem sessão arbitrária.

## Ambientes

Em `VERCEL_ENV=preview`, as ações ficam disponíveis para homologação.

Em `VERCEL_ENV=production`, a página pode carregar informações de leitura, mas ações ficam bloqueadas até existir a flag interna explícita `features.whatsapp_sync_diagnostics_execute = true` no tenant plataforma.

## Ações

- Diagnóstico: consulta status OpenWA, enfileira `manual_diagnostic` e processa no máximo um run com limites mínimos.
- Bootstrap controlado: até 100 chats, até 100 mensagens por chat, janela de 30 dias, ignorando grupos, um lote por clique.
- Incremental: usa checkpoints existentes e idempotência de mensagens, sem reimportar histórico inteiro.
- Processar próximo job: processa no máximo um job pendente do canal `lips-main`.

Nenhuma ação envia mensagens ao cliente.

## Segurança de dados

A página não exibe:

- telefones completos
- nomes completos de contatos
- conteúdo de mensagens
- tokens, cookies, secrets ou QR
- URL privada do provider
- stack trace

IDs técnicos são mascarados. Erros são truncados e URLs são redigidas.

## Preservação da fila

Antes e depois de cada execução, os campos críticos da fila são comparados em conversas existentes:

- `queue_status`
- `priority`
- `requires_human`
- `handoff_reason`
- `department_id`
- `assigned_user_id`
- `last_assigned_user_id`
- `queue_entered_at`
- `assigned_at`
- `sla_due_at`
- `sla_status`
- `resolved_at`
- `closed_at`

Se algum campo mudar indevidamente, a homologação retorna falha e não deve prosseguir.

## Checklist Allan

1. Abrir o Preview autenticado.
2. Entrar com conta de plataforma `owner/admin` com `organization_id = null`.
3. Abrir `/admin/diagnostics/whatsapp-sync`.
4. Executar `Diagnóstico`.
5. Executar `Bootstrap controlado` uma vez.
6. Enviar uma mensagem de teste para a Lips.
7. Executar `Incremental`.
8. Conferir contadores, duplicações e `Fila preservada: sim`.

Não aplicar `0036` durante esta homologação.
