# Internal Gateways

Data: 2026-07-12

Escopo: gateways internos do Centro de Comando. Não usar para clientes SaaS nem para a Lips.

## Persistência

Tabela: `internal_messaging_gateways`.

Campos principais:

- `tenant_id`;
- `name`;
- `slug`;
- `provider` inicialmente `openwa`;
- `base_url`;
- `environment` como `test` ou `production`;
- `status` como `active`, `inactive`, `error` ou `maintenance`;
- `version`;
- `max_sessions`;
- `last_health_check_at`;
- `last_error`;
- `metadata` sem secrets.

RLS: service-role only. A administração passa por `/api/operations/internal-gateways`, com sessão, tenant plataforma e role owner/admin.

## Segurança

Não salvar na tabela:

- API key;
- secret;
- token;
- cookie;
- refresh token.

Esses valores ficam em variáveis de ambiente ou secret manager do gateway.

## Health Check

Ação manual via `PATCH /api/operations/internal-gateways` com `action: "health_check"`.

O backend consulta:

- `/api/health/ready`;
- fallback `/api/health` se necessário.

Estados normalizados:

- `ready` quando o gateway confirma prontidão;
- `degraded` quando responde mas não confirma prontidão;
- `offline` quando falha;
- `online` reservado para resposta saudável sem sessão pronta.

O health check não roda em cada renderização.

## Channels

`channels.gateway_id` é nullable durante a transição.

Regra de unicidade:

```text
tenant_id + gateway_id + session_id
```

Permitido:

```text
gateway-01 / moriah-01
```

Bloqueado:

```text
gateway-01 / moriah-01
```

## Conexão WhatsApp

Fluxo:

1. cadastrar gateway;
2. rodar health check;
3. cadastrar canal interno em `/operations/channels`;
4. gerar `session_id` automaticamente;
5. clicar em Conectar WhatsApp;
6. backend resolve canal, gateway e sessão;
7. backend solicita start/QR ao gateway correto;
8. status da sessão é atualizado no canal;
9. resposta manual usa sempre o `channel_id` da conversa.

Não conectar número real sem autorização explícita do Allan.

## Primeiro Marco

Preparar dois números reais:

- Viciados em Trilhas: `viciados-01`, finalidade `sales`;
- Moriah Systems: `moriah-01`, finalidade `operations`.

Critério de aceite:

- inbound de Viciados entra no channel de Viciados;
- inbound de Moriah entra no channel de Moriah;
- resposta de Viciados usa `viciados-01`;
- resposta de Moriah usa `moriah-01`;
- mesmo contato em duas empresas não mistura conversas;
- grupos continuam sem envio.
