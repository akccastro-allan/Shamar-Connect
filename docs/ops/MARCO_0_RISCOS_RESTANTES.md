# Marco 0 — Riscos restantes

Estado após o Marco 0 (hardening da base). O que ficou aberto e precisa de ação.

## 1. Migration `0020` — APLICADA ✅
- `supabase/migrations/0020_drop_public_read_operational.sql` removeu as policies `public_read_*`.
- Confirmado em produção (`bbcxqvgdsdntwojjpwoz`): `public_read` restantes = **0**; `service_all` = 191 intactas; app segue lendo via service_role (1.238 contatos OK).
- A anon key não lê mais tabelas operacionais.

## 2. Segredos já vazaram no histórico do Git
- `.env.local` esteve versionado → todo segredo deve ser **rotacionado**. Ver [ROTACAO_SEGREDOS.md](ROTACAO_SEGREDOS.md).
- Destrack + `.gitignore` impedem novos commits, mas **não apagam o histórico**.

## 3. Banco Suite (auth central) não auditado neste marco
- Projeto `lquozwwszboxkmymzjcs` (tenants, app_users, tenant_users, invoices) pode ter o mesmo padrão `public_read`.
- **Próximo passo:** rodar a mesma auditoria de policies nele e replicar o `0020` se necessário.

## 4. RLS fina por usuário/departamento (Marco 1)
- Hoje o isolamento por tenant é feito **no código** (service_role + `.eq(organization_id)`), não por RLS.
- Um bug de escopo numa query exporia outro tenant. Marco 1: policies autenticadas por `tenant_id`/`role`/`department_id` como segunda barreira.

## 5. Tokens de canal em texto puro
- `channel_credentials`, `social_accounts.access_token` guardam tokens sem criptografia em repouso (apenas protegidos por RLS service_role).
- Marco futuro: criptografar em repouso.

## 6. Endpoints de diagnóstico agora exigem auth
- `system-test`, `system-check`, `supabase/health`, `*/diagnostics` passaram a exigir sessão (401 sem login).
- Se algum monitor externo (uptime) batia neles sem auth, vai passar a receber 401 — criar endpoint de health **público e sem dados** se precisar de monitoramento externo.

## Checklist de saída do Marco 0
- [x] `.gitignore` ignora `.env*` (exceto `.env.example`).
- [x] `.env.local` destrackeado (preservado no disco).
- [x] `.env.example` completo, sem segredos.
- [x] `ROTACAO_SEGREDOS.md` criado.
- [x] Leitura operacional migrada para service_role escopado por tenant.
- [x] Endpoints de diagnóstico protegidos.
- [x] `typecheck` e `build` verdes.
- [x] **Migration `0020` aplicada em produção** (public_read restantes = 0).
- [ ] Segredos rotacionados.
