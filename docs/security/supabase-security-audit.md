# Auditoria Supabase Security Advisor

Data: 2026-07-10

Escopo desta etapa: mapeamento somente leitura em código e migrations. Nenhuma migration foi aplicada, nenhuma policy foi criada e nenhum grant/revoke foi executado.

Validação solicitada:

```bash
rg "activate_paid_checkout_subscription|process_pending_whatsapp_provider_events|register_inbound_webhook_event|rls_auto_enable|upsert_global_search_item|create_import_job" .
```

Resultado: o shell local não possui `rg` instalado. A busca equivalente foi executada com a ferramenta `Grep` baseada em ripgrep. Foram encontradas ocorrências versionadas apenas para `activate_paid_checkout_subscription` e `process_pending_whatsapp_provider_events`.

## Resumo Executivo

| Classe | Quantidade | Observação |
|---|---:|---|
| Funções SECURITY DEFINER localizadas no repo | 2 | Ambas usadas por rotas server-side com `service_role`, mas potencialmente executáveis por `PUBLIC` se grants padrão não foram revogados no banco. |
| Funções indicadas pelo Advisor não localizadas no repo | 10 | Provável criação manual no Supabase ou migrations ausentes. Exigir extração com `pg_get_functiondef` antes de corrigir. |
| Views indicadas localizadas no repo | 0 | Nenhum uso por nome no app/migrations. Se existem no banco, estão não versionadas. |
| Tabelas RLS sem policy com intenção server-only comprovada | 3 | `message_media`, `message_transcriptions`, `transcription_jobs`. |
| Tabelas indicadas não localizadas em migrations | 8 | Exigem introspecção direta do banco antes de policy. |
| Search path mutável/insuficiente | 2 | Uma função sem `SET search_path`; uma com `SET search_path = public`, sem `pg_temp`. |
| Auth leaked password protection | 1 tarefa | Ativar manualmente no Supabase Auth. |

## Funções SECURITY DEFINER

| Objeto | Tipo | Advisor | Uso atual | Exposição | Risco | Correção recomendada | Prioridade | Migration necessária |
|---|---|---|---|---|---|---|---|---|
| `activate_paid_checkout_subscription` | função `SECURITY DEFINER` | Function Search Path Mutable / Exposed Function | Criada em `supabase/migrations/0025_billing_subscriptions_addons_retention.sql`. Chamada em `app/api/webhooks/asaas/route.ts`, `app/api/admin/provision-client/route.ts`, `app/api/admin/implantacao/[id]/provision/route.ts`. | Deve ser usada só por backend com `service_role`. Não há uso direto por `anon`/`authenticated` no app. Por padrão PostgreSQL pode conceder `EXECUTE` a `PUBLIC` se não revogado. | Ativa assinatura a partir de `checkout_id`. Se `anon/authenticated` executarem direto e souberem UUID de checkout pago/provisionado, podem criar subscription indevida ou repetir ativação idempotente. Não valida usuário/tenant chamador; confia no status do checkout. | Futuro: `REVOKE EXECUTE ON FUNCTION public.activate_paid_checkout_subscription(uuid) FROM anon, authenticated; GRANT EXECUTE ... TO service_role; ALTER FUNCTION ... SET search_path = public, pg_temp;` manter chamada somente por rotas protegidas/webhook validado. | P1 | Sim |
| `process_pending_whatsapp_provider_events` | função `SECURITY DEFINER` | Function Search Path Mutable / Exposed Function | Criada em `supabase/migrations/0016_fix_media_type_ambiguous.sql`. Chamada em `app/api/whatsapp/events/route.ts`, `app/api/internal/whatsapp/process-events/route.ts`, `app/api/provider-events/whatsapp-web/route.ts`. | Deve ser usada só por backend com `service_role` e endpoints protegidos por token interno/gateway. Não há uso direto por `anon`/`authenticated` no app. | Processa todos os `provider_events` pendentes sem filtro por tenant no parâmetro. Valida tenant indiretamente usando `ev.tenant_id`/`organization_id` ao criar conversas/mensagens. Se exposta, qualquer role com execute pode disparar processamento global e gerar DoS lógico ou processar eventos de outros tenants. | Futuro: `REVOKE EXECUTE ... FROM anon, authenticated; GRANT EXECUTE ... TO service_role; ALTER FUNCTION ... SET search_path = public, pg_temp;` avaliar parâmetro opcional por tenant/org ou manter estritamente service-only. | P1 | Sim |
| `register_inbound_webhook_event` | função não localizada no repo | Exposed Function / Search Path provável | Nenhuma criação/chamada localizada em código ou migrations. | Desconhecida. Advisor indica que existe no banco. | Sem definição não é possível confirmar validação de tenant, inserts e grants. Pelo nome, pode inserir eventos inbound e afetar `provider_events`/mensagens. | Extrair definição real com `pg_get_functiondef`, grants e owner. Até validar, assumir que `anon` não precisa e `authenticated` também não deve executar direto. | P1 | Provável |
| `rls_auto_enable` | função não localizada no repo | Exposed Function / Search Path provável | Nenhuma criação/chamada localizada. | Desconhecida. | Pelo nome, função administrativa para habilitar RLS. Exposição direta pode permitir mudanças estruturais indevidas se contiver SQL dinâmico. | Extrair definição. Provável `service_role`/admin only. Revogar `anon` e `authenticated` se concedidos. | P0 | Provável |
| `upsert_global_search_item` | função não localizada no repo | Exposed Function / Search Path provável | Nenhuma criação/chamada localizada. | Desconhecida. | Pode escrever índice global. Risco de contaminação cross-tenant se não validar tenant/org. | Extrair definição. Manter execução via backend/triggers; `anon` não precisa. `authenticated` só se houver validação robusta por tenant. | P1 | Provável |
| `create_import_job` | função não localizada no repo | Exposed Function / Search Path provável | Nenhuma criação/chamada localizada. | Desconhecida. | Pode criar jobs de importação. Risco de abuso/DoS se exposta. | Extrair definição e grants. Preferir service-only ou rota autenticada que valide tenant e quota. | P1 | Provável |
| `create_notification` | função não localizada no repo | Exposed Function / Search Path provável | Nenhuma criação/chamada localizada. | Desconhecida. | Pode gerar notificações para outros usuários/tenants se não validar destinatário/tenant. | Extrair definição. `anon` não precisa. `authenticated` só com validação de tenant/destinatário. | P1 | Provável |
| `create_system_alert` | função não localizada no repo | Exposed Function / Search Path provável | Nenhuma criação/chamada localizada. | Desconhecida. | Alerta de sistema deve ser administrativo. Se exposta, pode poluir dashboard/suporte ou vazar metadata. | Extrair definição. Provável `service_role`/platform admin only. | P1 | Provável |
| `log_application_event` | função não localizada no repo | Exposed Function / Search Path provável | Nenhuma criação/chamada localizada. | Desconhecida. | Logging exposto pode gerar spam/DoS ou inserir payloads indevidos. | Extrair definição. Preferir rota server-side com rate limit; revogar `anon` direto se concedido. | P2 | Provável |
| `complete_onboarding_step` | função não localizada no repo | Exposed Function / Search Path provável | Nenhuma criação/chamada localizada. | Desconhecida. | Pode alterar estado de onboarding. Risco médio se não validar tenant/user. | Extrair definição. `authenticated` pode ser aceitável apenas com validação de tenant e usuário dentro da função. | P1 | Provável |
| `mark_whatsapp_message_revoked` | função não localizada no repo | Exposed Function / Search Path provável | Nenhuma criação/chamada localizada. Existe lógica equivalente dentro de `process_pending_whatsapp_provider_events`. | Desconhecida. | Pode marcar mensagens como revogadas. Se exposta, usuário pode alterar histórico de mensagens de outro tenant. | Extrair definição. Provável service-only/webhook-only. | P1 | Provável |
| `search_global` | função não localizada no repo | Exposed Function / Search Path provável | Nenhuma criação/chamada localizada. | Desconhecida. | Busca global é sensível: risco de vazamento cross-tenant se `SECURITY DEFINER` ignorar RLS/tenant. | Extrair definição antes de qualquer grant. `anon` não precisa. `authenticated` só com filtro obrigatório por tenant/app_user. Considerar `SECURITY INVOKER` se viável. | P0 | Provável |

### Matriz de execução recomendada por função

| Função | Quem precisa executar | anon precisa? | authenticated precisa? | service_role precisa? | Pode revogar anon? | Pode revogar authenticated? | Validação de tenant dentro da função | Risco de elevação |
|---|---|---|---|---|---|---|---|---|
| `activate_paid_checkout_subscription` | Webhook Asaas/admin provisioning via backend | Não | Não | Sim | Sim | Sim | Parcial: usa tenant/org do checkout, não valida chamador | Médio/alto |
| `process_pending_whatsapp_provider_events` | Webhook/cron interno via backend | Não | Não | Sim | Sim | Sim | Parcial: usa tenant/org do evento, sem filtro por chamador | Alto se executável fora do backend |
| `register_inbound_webhook_event` | A confirmar | Não até prova contrária | Não até prova contrária | Provável | Provável | Provável | Não auditado | Desconhecido |
| `rls_auto_enable` | DBA/service/admin | Não | Não | Provável | Sim | Sim | Não auditado | Alto |
| `upsert_global_search_item` | Backend/triggers | Não | Só se tenant-safe comprovado | Provável | Sim | Provável | Não auditado | Alto |
| `create_import_job` | Backend autenticado/agent | Não | Só via rota ou função tenant-safe | Provável | Sim | Provável | Não auditado | Médio/alto |
| `create_notification` | Backend | Não | Só se destinatário/tenant-safe | Provável | Sim | Provável | Não auditado | Médio/alto |
| `create_system_alert` | Backend/platform admin | Não | Não | Provável | Sim | Sim | Não auditado | Alto |
| `log_application_event` | Backend | Não | Só com rate limit e tenant-safe | Provável | Sim | Provável | Não auditado | Médio |
| `complete_onboarding_step` | Backend/app autenticado | Não | Talvez, se tenant-safe | Provável | Sim | Não decidir sem definição | Não auditado | Médio |
| `mark_whatsapp_message_revoked` | Webhook processor | Não | Não | Provável | Sim | Sim | Não auditado | Alto |
| `search_global` | App autenticado | Não | Talvez, se invoker/tenant-safe | Talvez | Sim | Não decidir sem definição | Não auditado | Alto/P0 |

## Views SECURITY DEFINER

Nenhuma das views abaixo foi localizada por nome em código ou migrations. Isso significa que, se o Supabase Advisor as lista, elas existem no banco mas não estão versionadas no repositório atual.

| Objeto | Tipo | Advisor | Uso atual | Exposição | Risco | Correção recomendada | Prioridade | Migration necessária |
|---|---|---|---|---|---|---|---|---|
| `crm_dashboard_summary` | view | SECURITY DEFINER view | Não localizada no app/migrations. | Desconhecida. | Pode expor métricas CRM cross-tenant se não filtrar tenant. | Extrair SQL da view. Se usada por usuários tenant, preferir `security_invoker = true` e filtros por tenant; se admin-only, restringir grants. | P1 | Provável |
| `crm_contacts_with_tags` | view | SECURITY DEFINER view | Não localizada. | Desconhecida. | Pode expor contatos/tags entre tenants. | Extrair SQL. Preferir view normal ou `security_invoker = true`; validar join por `tenant_id`/`organization_id`. | P1 | Provável |
| `support_queue_summary` | view | SECURITY DEFINER view | Não localizada. | Desconhecida. | Pode expor suporte/filas entre tenants ou dados administrativos. | Extrair SQL; restringir a platform admin ou tornar invoker com policies. | P1 | Provável |
| `conversation_assignment_summary` | view | SECURITY DEFINER view | Não localizada. | Desconhecida. | Pode expor atribuições/conversas cross-tenant. | Extrair SQL; exigir filtro por tenant/org. | P1 | Provável |
| `catalog_items_with_category` | view | SECURITY DEFINER view | Não localizada. | Desconhecida. | Pode expor catálogo comercial entre tenants. | Extrair SQL; se app consultar catálogo via backend service-only, considerar remover grants públicos; se direto por auth, usar invoker. | P1 | Provável |
| `automation_dashboard_summary` | view | SECURITY DEFINER view | Não localizada. | Desconhecida. | Pode expor jobs/automações de tenants. | Extrair SQL; restringir ou usar invoker com tenant filters. | P1 | Provável |
| `finance_dashboard_summary` | view | SECURITY DEFINER view | Não localizada. | Desconhecida. | Financeiro é sensível; cross-tenant seria grave. | Extrair SQL; platform/admin/tenant filters obrigatórios. | P0/P1 | Provável |
| `tenants_summary` | view | SECURITY DEFINER view | Não localizada. | Desconhecida. | Exposição administrativa de tenants. | Extrair SQL; provável platform admin only; não usar para tenant authenticated. | P1 | Provável |
| `multi_tenant_dashboard_summary` | view | SECURITY DEFINER view | Não localizada. | Desconhecida. | Dashboard multi-tenant é administrativo; risco de vazamento amplo. | Extrair SQL; platform admin only ou invoker com checagem explícita de admin. | P1 | Provável |

## RLS Sem Policy

Classificação baseada em migrations e uso de código. RLS ligado sem policy bloqueia `anon`/`authenticated`; em várias tabelas isso parece intencional porque o app usa API routes com `service_role` e valida contexto no backend.

| Objeto | Tipo | Advisor | Uso atual | Exposição | Risco | Correção recomendada | Prioridade | Migration necessária |
|---|---|---|---|---|---|---|---|---|
| `agent_catalog_products` | tabela | RLS enabled no policy | Não localizada em código/migrations. | Desconhecida. | Objeto não versionado; não criar policy genérica. | Introspectar schema/uso. Classificar provisoriamente como `unused` ou `service_role only`. | P3 | Talvez |
| `agent_connector_types` | tabela | RLS enabled no policy | Não localizada. | Desconhecida. | Pode ser catálogo público de conectores, mas não há uso. | Introspectar. Se for catálogo estático, avaliar public read intencional; caso contrário service-only. | P3 | Talvez |
| `agent_dialog_templates` | tabela | RLS enabled no policy | Não localizada. | Desconhecida. | Templates podem conter prompt/dados internos. | Introspectar. Provável service_role/platform admin. | P2 | Talvez |
| `agent_installations` | tabela | RLS enabled no policy | Citada em `AI_HANDOFF.md`, não usada no app. | Bloqueada para anon/auth por RLS sem policy. | Server/agent only; sem policy pode ser intencional. | Manter bloqueada até existir fluxo autenticado. | P3 | Não agora |
| `agent_sync_runs` | tabela | RLS enabled no policy | Citada em docs, não usada no app. | Bloqueada para anon/auth. | Histórico operacional; server-only. | Manter bloqueada; se UI futura precisar, criar policy tenant/admin específica. | P3 | Não agora |
| `ai_response_logs` | tabela | RLS sem policy ou RLS ausente no repo | Criada em `0007_ai_response_logs.sql`; usada por `app/api/ai/*` com `service_role` e `getRequiredAppContext()` para filtrar tenant/org. | API server-side, não acesso direto client. | Contém prompt, mensagem e resposta sugerida. Policy genérica seria perigosa. | Se RLS está ligado sem policy no banco, manter server-only por enquanto. Futuro: policy tenant authenticated só se a UI passar a consultar Supabase direto. | P2 | Talvez |
| `billing_checkout_sessions` | tabela | RLS enabled no policy | Criada fora das migrations; usada por checkout público server-side, Asaas webhook e admin implantação com `service_role`. | Server-only. | Dados pessoais e pagamento. Direct authenticated não deve ler sem filtro. | Manter server-only; não criar public read. Se dashboard tenant precisar, policy restrita por tenant/org. | P1 | Talvez |
| `billing_plan_price_rules` | tabela | RLS enabled no policy | Não criada em migrations; lida por `app/api/checkout/asaas/route.ts` com `service_role`. | Server-side público via API de checkout. | Pode ser public read intencional, mas não precisa expor direto. | Manter server-only ou criar public read apenas se houver necessidade client-side. | P3 | Não agora |
| `billing_subscriptions` | tabela | RLS enabled no policy | Criada fora das migrations; alterada em `0025`; lida por settings/admin com `service_role` e contexto. | Server-only. | Financeiro/assinatura por tenant; cross-tenant crítico. | Manter bloqueada para anon/auth. Futuro policy tenant authenticated apenas select por tenant/org. | P1 | Talvez |
| `message_media` | tabela | RLS enabled no policy | Criada em `0023`; usada por `lib/inbox/persist-inbound.ts`, `lib/media/download.ts`, `lib/media/transcribe.ts`, rota media. Comentário da migration diz explicitamente “RLS ativa SEM policies; acesso só via service_role”. | Server-only intencional. | Mídia privada; direct access não deve existir. | Manter sem policy; signed URLs via backend. | P3 | Não |
| `message_transcriptions` | tabela | RLS enabled no policy | Criada em `0023`; usada por `lib/media/transcribe.ts`. | Server-only intencional. | Transcrição pode conter dados pessoais/sensíveis. | Manter sem policy; expor somente via rotas com contexto tenant. | P3 | Não |
| `transcription_jobs` | tabela | RLS enabled no policy | Criada em `0023`; fila background. | Server-only intencional. | Job queue não deve ser manipulável por cliente. | Manter sem policy. | P3 | Não |
| `whatsapp_connections` | tabela | RLS enabled no policy | Não localizada em migrations; usada por rotas WhatsApp Web com `service_role` e contexto. | Server-only. | Estado de conexão/sessão; expor direto pode vazar operação. | Manter server-only; se UI precisar, usar API route já existente. | P2 | Talvez |
| `whatsapp_conversation_events` | tabela | RLS enabled no policy | Não localizada em migrations; usada por automação, envio, atribuição e watchdog com `service_role`. | Server-only/auditoria. | Eventos operacionais podem vazar histórico/ações. | Manter server-only; policy tenant read só se houver timeline direta via client. | P2 | Talvez |

## Search Path

| Objeto | Tipo | Advisor | Uso atual | Exposição | Risco | Correção recomendada | Prioridade | Migration necessária |
|---|---|---|---|---|---|---|---|---|
| `activate_paid_checkout_subscription` | função | Search path mutable/hardening | `SECURITY DEFINER SET search_path = public`. | Função privilegiada. | `public` fixo reduz risco, mas falta `pg_temp`; padrão recomendado Supabase é `public, pg_temp` ou caminho mais restrito. | Futuro: `ALTER FUNCTION public.activate_paid_checkout_subscription(uuid) SET search_path = public, pg_temp;` | P2 | Sim |
| `process_pending_whatsapp_provider_events` | função | Search path mutable | Não define `search_path`. | Função privilegiada. | Função SECURITY DEFINER sem search_path fixo é hardening pendente. Embora objetos sejam qualificados com `public.`, ainda é recomendado fixar. | Futuro: `ALTER FUNCTION public.process_pending_whatsapp_provider_events(integer) SET search_path = public, pg_temp;` | P1/P2 | Sim |
| Funções não localizadas | função | Search path mutable provável | Definições ausentes no repo. | Desconhecida. | Não é possível auditar sem `pg_get_functiondef`. | Extrair definição e listar `proconfig`. Aplicar `SET search_path` individualmente, não em massa. | P1/P2 | Provável |

## Auth

| Objeto | Tipo | Advisor | Uso atual | Exposição | Risco | Correção recomendada | Prioridade | Migration necessária |
|---|---|---|---|---|---|---|---|---|
| Supabase Auth leaked password protection | configuração Auth | Leaked password protection disabled | Não auditável no repo. | Login público. | Usuários podem escolher senha já vazada. | Tarefa operacional: ativar leaked password protection no Supabase Auth Dashboard. Não alterar automaticamente nesta etapa. | P2 | Não |

## Prioridades

### P0

- `rls_auto_enable`: função não versionada; se for administrativa e executável por `anon/authenticated`, pode permitir alteração estrutural/privilegiada. Confirmar definição/grants.
- `search_global`: função não versionada; se for `SECURITY DEFINER` e não filtrar tenant, pode vazar dados cross-tenant.
- `finance_dashboard_summary`: view não versionada; se security definer sem filtro/admin check, pode expor dados financeiros multi-tenant.

### P1

- Revogar execução direta de `anon`/`authenticated` em `activate_paid_checkout_subscription` e `process_pending_whatsapp_provider_events`, mantendo `service_role`.
- Extrair e auditar definições das 10 funções não localizadas antes de qualquer correção.
- Extrair SQL das views security definer e decidir entre `security_invoker = true`, restrição de grants ou remoção.
- Confirmar policies/grants reais de `billing_checkout_sessions`, `billing_subscriptions`, `whatsapp_connections` e `whatsapp_conversation_events`.

### P2

- Hardening de `search_path` em funções SECURITY DEFINER.
- Ativar leaked password protection no Supabase Auth.
- Avaliar policy tenant authenticated específica para `ai_response_logs` apenas se houver consulta direta pelo cliente; hoje a API usa service_role e filtra contexto.

### P3

- Manter `message_media`, `message_transcriptions`, `transcription_jobs` sem policy direta; server-only é intencional na migration.
- Tabelas `agent_*` sem uso atual podem permanecer bloqueadas até implementação real.

## Correções Propostas

1. Criar migration pequena e revisada para revogar `EXECUTE` de `anon`/`authenticated` apenas nas funções confirmadas como server-only.
2. Aplicar `SET search_path = public, pg_temp` função por função.
3. Extrair definições ausentes do banco com consulta administrativa somente leitura:

```sql
select
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef as security_definer,
  p.proconfig,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'register_inbound_webhook_event',
    'rls_auto_enable',
    'upsert_global_search_item',
    'create_import_job',
    'create_notification',
    'create_system_alert',
    'log_application_event',
    'complete_onboarding_step',
    'mark_whatsapp_message_revoked',
    'search_global'
  );
```

4. Extrair views com:

```sql
select schemaname, viewname, definition
from pg_views
where schemaname = 'public'
  and viewname in (
    'crm_dashboard_summary',
    'crm_contacts_with_tags',
    'support_queue_summary',
    'conversation_assignment_summary',
    'catalog_items_with_category',
    'automation_dashboard_summary',
    'finance_dashboard_summary',
    'tenants_summary',
    'multi_tenant_dashboard_summary'
  );
```

5. Antes de qualquer policy em tabela RLS sem policy, confirmar se a UI acessa Supabase direto ou via API route. O padrão atual do app é API route + `service_role` + `getRequiredAppContext()`.

## Migration ainda não aplicada

Nenhuma migration aplicada nesta etapa.

## Itens que não devem ser feitos em lote

- Não executar `grant execute on all functions`.
- Não executar `revoke execute on all functions`.
- Não alterar views em massa.
- Não criar policy genérica `using (true)`.
- Não tornar tabelas financeiras, mídia ou logs public read.
