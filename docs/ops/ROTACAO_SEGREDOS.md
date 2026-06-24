# Rotação de Segredos — Marco 0

**Motivo:** o `.env.local` esteve **versionado no Git** (histórico). Todo segredo que passou por ele deve ser considerado **comprometido** e **rotacionado**, mesmo após o destrack. Remover do tracking NÃO remove do histórico.

> Não cole valores de segredo neste arquivo. Ele é um checklist.

## Segredos a rotacionar (porque estiveram no Git)

- [ ] **Supabase `SUPABASE_SERVICE_ROLE_KEY`** (app `bbcxqvgdsdntwojjpwoz`) — Dashboard → Settings → API → reset/rotate service_role.
- [ ] **Supabase `NEXT_PUBLIC_SUPABASE_ANON_KEY`** — rotacionar junto (e revisar RLS, ver Marco 0 item B).
- [ ] **Supabase Suite** (`lquozwwszboxkmymzjcs`) — `SUITE_SUPABASE_SERVICE_ROLE_KEY` e anon.
- [ ] **`SESSION_SECRET`** — gerar novo (`openssl rand -base64 48`); invalida sessões ativas (re-login).
- [ ] **`WHATSAPP_WEB_GATEWAY_TOKEN`** — trocar no gateway (Railway) e no app.
- [ ] **`META_APP_SECRET` / `WHATSAPP_CLOUD_APP_SECRET`** — Meta App → Settings → reset App Secret.
- [ ] **`META_WHATSAPP_TOKEN` / `WHATSAPP_CLOUD_ACCESS_TOKEN`** — regenerar token de página/system user.
- [ ] **`EVOLUTION_API_KEY`** — trocar `AUTHENTICATION_API_KEY` na Evolution e no app.
- [ ] **`RESEND_API_KEY`** — Resend → API Keys → revogar e recriar.
- [ ] **`OPENAI_API_KEY`** — OpenAI → revogar e recriar.
- [ ] **`ASAAS_API_KEY` / `ASAAS_WEBHOOK_TOKEN` / `SHAMARCONNECT_WEBHOOK_TOKEN`** — Asaas → rotacionar.
- [ ] **`INTERNAL_API_KEY`** — gerar novo.

## Procedimento por segredo
1. Gerar/rotacionar o valor no provedor.
2. Atualizar na **Vercel** (Environment Variables) e nos serviços (Railway/Evolution) que usam.
3. **Redeploy** (Vercel) e restart (Railway) para aplicar.
4. Validar a funcionalidade afetada.
5. Marcar o item acima.

## (Opcional, recomendado) Limpar histórico do Git
O `.env.local` continua no histórico de commits antigos. Para remover de vez:
- usar `git filter-repo` (ou BFG) para apagar `.env.local` de todo o histórico, depois `git push --force` (coordenar com o time, pois reescreve hashes).
- Alternativa pragmática: **apenas rotacionar tudo** (acima) — o histórico fica, mas os valores deixam de ser válidos.

## Status
- [x] `.env.local` removido do tracking (`git rm --cached`), arquivo preservado no disco.
- [x] `.gitignore` passa a ignorar `.env` e `.env.*` (exceto `.env.example`).
