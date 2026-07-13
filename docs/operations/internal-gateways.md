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

Migration: `supabase/migrations/0032_internal_messaging_gateways.sql`. Criada e revisada, mas não aplicada em produção nesta etapa.

## Schema Auditado

Base real usada pela migration:

- `channels.id`: `uuid`;
- `channels.tenant_id`: `uuid not null`;
- `channels.organization_id`: `uuid not null`;
- `channels.session_id`: `text not null`;
- `channels` já possui RLS com `service_all_channels` e `public_read_channels`;
- `tenants.id`: `uuid`;
- `organizations.tenant_id`: `uuid references tenants(id)`.

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

- `/api/health`;
- `/api/health/ready`;

Estados normalizados:

- `ready` quando o gateway confirma prontidão;
- `degraded` quando responde mas não confirma prontidão;
- `offline` quando falha;
- `configuration` quando o health retorna 401/403;
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
gateway-02 / moriah-01
```

Bloqueado:

```text
gateway-01 / moriah-01
gateway-01 / moriah-01
```

## Rollback Manual Seguro

Não executar automaticamente. Se a migration precisar ser revertida antes de uso real:

```sql
drop index if exists public.channels_tenant_gateway_session_uniq;
drop index if exists public.channels_tenant_gateway_id_idx;
drop index if exists public.channels_gateway_id_idx;
alter table public.channels drop column if exists gateway_id;
drop trigger if exists internal_messaging_gateways_touch_updated_at on public.internal_messaging_gateways;
drop function if exists public.touch_internal_messaging_gateways_updated_at();
drop table if exists public.internal_messaging_gateways;
```

Esse rollback não apaga `channels`, mensagens, conversas ou dados da Lips. Só deve ser usado antes de existir gateway interno real em uso.

## Operação Visual

Na tela `/operations/channels`, a seção Gateways de comunicação permite:

- cadastrar gateway;
- editar nome, URL base, ambiente, status e limite;
- manter slug imutável após criação;
- ativar;
- colocar em manutenção;
- desativar;
- verificar saúde manualmente;
- filtrar canais WhatsApp relacionados.

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
