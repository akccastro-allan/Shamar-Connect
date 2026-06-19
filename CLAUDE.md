# ShamarConnect — Contexto para Claude

Central de atendimento, CRM e vendas para empresas que operam pelo WhatsApp.
Desenvolvido pela Moriah Systems (Rio de Janeiro). Cliente: Allan Castro.

---

## Stack

- **Next.js 16** App Router + Turbopack
- **Supabase** (projeto `bbcxqvgdsdntwojjpwoz`) — PostgreSQL + RLS
- **TypeScript** estrito
- **Tailwind CSS** — design system próprio
- **Railway** — gateway WhatsApp Web (whatsapp-web.js)
- **Vercel** — deploy

## Variáveis de ambiente obrigatórias

```
SESSION_SECRET=          # min 32 chars, HMAC-SHA256
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WHATSAPP_GATEWAY_URL=
WHATSAPP_GATEWAY_TOKEN=
```

---

## Autenticação

Cookie `shamar_connect_session` = `base64url(JSON).base64url(HMAC-SHA256)`.
`lib/auth/session.ts` — encode/decode com `timingSafeEqual`.
`lib/auth/app-context.ts` — `getRequiredAppContext()` → `{ tenantId, organizationId, appUserId, tenantUserId, role, email, name }`.
`proxy.ts` — guarda rotas protegidas (substitui middleware no Next.js 16).

## Sessões WhatsApp permitidas

`hall-main`, `lips-main`, `viciados-main`, `mkshalom-main`, `oriahfin-main`, `shamar-main`, `shamarerp-main`, `shamarkids-main`
Sessão inválida → `resolveSessionClient()` retorna null → API retorna 400.

## Regra absoluta

**Grupos nunca recebem resposta automática.** `is_group = true` ou `@g.us` → `skipped`.

---

## Empresas ativas

| Empresa | Sessão | Status |
|---------|--------|--------|
| Hall Donous | `hall-main` | Em operação |
| Lips | `lips-main` | Em operação |
| Viciados em Trilhas | `viciados-main` | Em operação |
| MK Shalom | `mkshalom-main` | Em preparação |
| Oriahfin | `oriahfin-main` | Em preparação |
| Shamar Kids | `shamarkids-main` | Cloud API |

---

## Estrutura de arquivos (convenção)

Ver `docs/file-organization.md` para o mapa completo.

```
app/(site)/         Rotas públicas (home, blog, planos, contato, sobre)
app/api/            API routes — sempre { ok, data/error }
lib/auth/           Sessão e contexto
lib/providers/      Clientes de gateways externos
lib/supabase/       Clientes Supabase
components/site/    Componentes do site público
components/ui/      Primitivos shadcn
docs/ops/           Guias operacionais
docs/strategy/      Roadmap e estratégia
docs/architecture/  Decisões técnicas
```

---

## Fase atual: Operação Real Assistida

1. Corrigir bugs reportados em uso real → registrar em `docs/real-world-feedback.md`
2. Melhorias de UX e performance
3. Melhorias no Operations Center (`/operations`)
4. Preparação do Attention Engine (só após zero itens críticos em `real-world-feedback.md`)

Sem novas grandes funcionalidades até existir feedback real.

---

## Comportamento esperado quando o usuário escreve "vamos trabalhar"

1. Se há tarefas pendentes → executar imediatamente
2. Se não há → checar build, tipos, migrations, imports quebrados
3. Se sistema OK → sugerir melhorias concretas

---

## Comandos úteis

```bash
npm run build          # build de produção
npm run dev            # dev com Turbopack
npx tsc --noEmit       # type check sem build
```

---

## Supabase

Projeto: `bbcxqvgdsdntwojjpwoz`
Migrations em `supabase/migrations/` — numeradas `0001..NNNN_nome.sql`.
RLS em todas as tabelas: `service_role` para escrita, `public_read_*` para leitura pública.
`createSupabaseWriteClient()` → service_role (escrita e leitura de dados protegidos).
`createSupabaseServerClient()` → anon key (leitura de dados públicos).

---

## Design system

| Token | Valor |
|-------|-------|
| Navy | `#1B2F5B` |
| Teal | `#2ABFAB` |
| Gold | `#C9952A` |
| Background | `#F8FAFC` |

Bordas arredondadas premium: `rounded-[2rem]` para cards, `rounded-full` para botões/badges.
Fonte: `font-black` para títulos e CTAs.
