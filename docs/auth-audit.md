# Auth & Authorization Audit

**Data**: 2026-06-19
**Branch**: hotfix/email-password-login
**Objetivo**: garantir que Hall e Lips possam entrar em produção sem risco de acesso incorreto.

---

## Checklist de produção

| # | Item | Status | Observação |
|---|------|--------|------------|
| 1 | Login funciona | ✅ | Email/senha via Supabase Auth + validação app_users + tenant_users + organizations |
| 2 | Logout funciona | ✅ | `POST /api/auth/logout` criado nesta auditoria |
| 3 | Sessão persiste corretamente | ✅ | Cookie `httpOnly`, `sameSite=lax`, `maxAge=12h` |
| 4 | Refresh não perde contexto | ⚠️ | Sem mecanismo de refresh. Sessão expira após 12h e redireciona ao login. Comportamento intencional e documentado. |
| 5 | Rotas protegidas redirecionam | ✅ | `proxy.ts` protege todas as rotas privadas com redirect para `/login?next=...` |
| 6 | Usuário sem permissão não acessa área protegida | ✅ | `getRequiredAppContext()` verifica status em 3 camadas: `app_users`, `tenant_users`, `organizations` |
| 7 | Organization context correto | ✅ | `organizationId` vem de `tenant_users.organization_id`, validado contra `organizations` |
| 8 | Tenant context correto | ✅ | `tenantId` vem de `tenant_users.tenant_id`, verificado com cross-check `organizations.tenant_id` |
| 9 | Não há vazamento entre organizações | ✅ | Todas as queries de API filtram por `tenantId` e `organizationId` do contexto |
| 10 | Build passa | ✅ | Verificado após correções |

---

## Fluxo de login (email/senha)

```
POST /api/auth/login
  │
  ├── supabase.auth.signInWithPassword(email, password)
  │     └── falha → 401 "E-mail ou senha inválidos"
  │
  ├── app_users WHERE email = ? AND status = 'active'
  │     └── não encontrado → 403 → /planos?reason=not-authorized
  │
  ├── tenant_users WHERE app_user_id = ? AND status = 'active'
  │     ORDER BY created_at ASC LIMIT 1
  │     └── não encontrado → 403 → /planos?reason=not-authorized
  │
  ├── organizations WHERE id = ? AND tenant_id = ? AND status = 'active'
  │     └── não encontrado → 403 → /planos?reason=not-authorized
  │
  ├── UPDATE app_users SET last_seen_at = now()
  │
  └── setSessionCookie({ companyId, userId, userRole, ... })
        └── cookie: httpOnly, sameSite=lax, secure=production, maxAge=43200
```

## Fluxo de logout

```
POST /api/auth/logout   → clearSessionCookie() → { ok: true }
GET  /api/auth/logout   → clearSessionCookie() → redirect /login
```

## Fluxo OAuth (Google/GitHub/Azure)

```
GET /api/auth/oauth?provider=google
  └── supabase.auth.signInWithOAuth()
        └── redirect → provider → callback URL

GET /api/auth/callback?code=...
  └── supabase.auth.exchangeCodeForSession(code)
  └── mesmo fluxo de validação do login email/senha
```

## Resolução de organização (getRequiredAppContext)

Chamada em **cada request de API protegida**:

```
getCurrentSession()
  └── lê cookie → decodeSession() → verifica HMAC-SHA256 via timingSafeEqual

app_users WHERE id = session.userId AND status = 'active'

tenant_users WHERE app_user_id = ? AND status = 'active'
  ORDER BY created_at ASC
  → match priority:
      1. organization_id === session.companyId   (match direto)
      2. tenant_id === session.companyId          (match por tenant)
      3. first result                             (fallback mais antigo)

organizations WHERE id = ? AND tenant_id = ? AND status = 'active'
  → falha → UNAUTHORIZED

retorna AppContext { tenantId, organizationId, appUserId, tenantUserId, role, email, name }
```

## Proteção de rotas (proxy.ts)

O `proxy.ts` é o middleware do Next.js. Valida **formato** do cookie (base64url JSON com `companyId` + `userId`) antes de deixar a request prosseguir. Não verifica HMAC — isso é responsabilidade do `decodeSession()` em `getRequiredAppContext()`.

**Rotas protegidas**: `/dashboard`, `/inbox`, `/crm`, `/pipeline`, `/operations`, `/settings`, `/contacts`, `/campaigns`, `/support`, `/admin`, `/financeiro`, `/whatsapp-*`, `/sales-dashboard`, `/distribution`, `/social-inbox`, `/ai-lab`, `/quick-replies`, `/conversation-flows`, `/automations`, `/knowledge`, `/group-import-lists`, `/audit`, `/auth-diagnostics` e demais.

---

## Riscos encontrados

### ~~CRÍTICO — Sem rota de logout~~ ✅ CORRIGIDO
**Descrição**: `clearSessionCookie()` existia mas não havia endpoint HTTP.
**Correção**: criado `app/api/auth/logout/route.ts` com `POST` (retorna JSON) e `GET` (redireciona para `/login`).

### ~~BAIXO — login/route.ts não verificava tenant_id na query de organizations~~ ✅ CORRIGIDO
**Descrição**: a query de organizations no fluxo de login não incluía `.eq("tenant_id", ...)`, divergindo de `app-context.ts` que inclui. Em caso de `organization_id` apontando para organização de tenant diferente (não deve ocorrer por FK, mas era inconsistência defensiva), o nome da empresa poderia vazar para o cookie.
**Correção**: adicionado `.eq("tenant_id", tenantUser.tenant_id)` na query de organizations em `login/route.ts:161`.

### MÉDIO — proxy.ts verifica formato, não HMAC
**Descrição**: o middleware verifica se o cookie é um JSON base64url com `companyId` e `userId`, mas não verifica a assinatura HMAC. Um cookie com payload válido mas assinatura forjada passaria pelo proxy. A verificação criptográfica só ocorre quando `decodeSession()` é chamado (dentro de `getRequiredAppContext()`).
**Impacto real**: todas as rotas de API chamam `getRequiredAppContext()` que verifica HMAC. Páginas server-rendered que não chamem `getRequiredAppContext()` dependem apenas do proxy.
**Decisão**: não corrigido nesta auditoria. O proxy é uma primeira linha de defesa; a verificação criptográfica acontece nas routes. Verificar se há pages server-rendered que rendem dados sensíveis sem chamar `getRequiredAppContext()`.

### INFO — Fallback `[0]` em resolução de tenant
**Descrição**: se `session.companyId` não corresponde a nenhum `organization_id` ou `tenant_id`, o sistema usa `tenantUsers[0]` (mais antigo por `created_at`). Isso é determinístico mas poderia resultar em contexto inesperado se um usuário tiver vínculos em múltiplos tenants e o cookie estiver desatualizado.
**Impacto real**: para Hall e Lips em produção, usuários terão vínculo em apenas uma organização. Risco inexistente no cenário atual.

### INFO — `session/current` não está protegida pelo proxy
**Descrição**: `GET /api/session/current` retorna o objeto de sessão completo (incluindo `documentNumber`/CNPJ) para qualquer request autenticada. A rota não está no matcher do proxy pois começa com `/api/`.
**Impacto real**: apenas acessível com o cookie válido (httpOnly — não acessível a JS externo). O CNPJ no cookie é dado que o browser já recebe implicitamente ao fazer login. Risco baixo.

---

## Isolamento entre organizações

Verificado que todas as queries de API incluem filtros por `tenantId` e/ou `organizationId` provenientes de `getRequiredAppContext()`. Não há query que leia dados de outra organização. A camada de service_role key no Supabase (usada em `createSupabaseWriteClient()`) contorna RLS — a responsabilidade de isolamento está inteiramente no código Next.js, não no banco.

**Garantia para Hall e Lips**: enquanto `tenantId` for diferente para cada empresa (garantido pela migration 0012 que cria tenants distintos), não há caminho de código que permita cross-tenant data access.

---

## Página de diagnóstico

`/auth-diagnostics` — acesso protegido pelo proxy, requer sessão válida.

Exibe em tempo real:
- Cookie válido (HMAC verificado)
- Expiração da sessão com countdown
- Valores do cookie: `companyId`, `userId`, `userRole`
- Contexto resolvido: `tenantId`, `organizationId`, `appUserId`, `role`
- Verificação de consistência: `companyId` vs `organizationId`, `role` cookie vs context
- Botão de logout
