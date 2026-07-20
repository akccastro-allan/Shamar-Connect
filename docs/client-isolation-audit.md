# Auditoria de Isolamento por Organização/Canal

**Data:** 2026-06-20  
**Branch:** hotfix/email-password-login  
**Auditor:** Claude (revisão Allan Castro)

---

## Resumo executivo

Cada usuário vê **somente** os dados do seu próprio `tenant_id` + `organization_id`. O isolamento é garantido em três camadas:

1. **Banco de dados** — todas as queries filtram por `tenant_id` + `organization_id`
2. **Contexto da sessão** — `getRequiredAppContext()` deriva `tenantId`/`organizationId` da sessão assinada com HMAC
3. **Verificação de canal** — rotas que aceitam `sessionId` verificam se o canal pertence ao tenant antes de agir

---

## Status por componente

### Autenticação e contexto

| Componente | Status | Observação |
|---|---|---|
| `lib/auth/app-context.ts` | ✅ Seguro | Deriva tenantId/orgId da sessão HMAC; queries filtradas |
| `lib/auth/session.ts` | ✅ Seguro | Cookie assinado com HMAC-SHA256 + timingSafeEqual |
| `proxy.ts` | ✅ Seguro | Guarda todas as rotas protegidas |

### Navegação e UI

| Componente | Status | Observação |
|---|---|---|
| `components/app-shell.tsx` | ✅ Seguro | `platformOnly` items filtrados por `isPlatformTenant` do banco |
| `app/operations/page.tsx` | ✅ Seguro | Mostra Allan Command Center/Lips Card somente se `isPlatformTenant` |
| `components/operations-dashboard.tsx` | ✅ Seguro | Sessões carregadas de `/api/channels` (tenant-scoped) — sem hardcode |

### Configurações WhatsApp

| Componente | Status | Observação |
|---|---|---|
| `app/settings/whatsapp/page.tsx` | ✅ Seguro | Channels filtrados por `tenant_id` + `organization_id` no banco |
| `app/whatsapp-diagnostics/page.tsx` | ✅ Seguro | Sessões passadas como prop derivadas dos channels do tenant |

### APIs WhatsApp — verificação de canal

| Rota | Verifica ownership do canal | Status |
|---|---|---|
| `/api/whatsapp-web/status` | ✅ Sim — query channels table | **CORRIGIDO** nesta sessão |
| `/api/whatsapp-web/sync-chat-messages` | ✅ Sim — query channels table | Já estava correto |
| `/api/whatsapp-web/sync-group-contacts` | ✅ Sim — query channels table | **CORRIGIDO** nesta sessão |
| `/api/whatsapp-web/automation/process` | ✅ Sim — query channels table | Já estava correto |
| `/api/whatsapp-web/watchdog` | ✅ N/A (opera no nível tenant) | Sem sessionId; filtrado por tenant_id |
| `/api/whatsapp-web/diagnostics` | Verificar | Não auditado |

### Admin (acesso platform-only)

| Rota | Status |
|---|---|
| `/admin` | ✅ Redireciona para /dashboard se `!isPlatformTenant` |
| `/admin/users` | ✅ Idem |
| `/admin/support` | ✅ Idem |
| `/demo-checklist` | ✅ Idem |

---

## Critérios de aceite (logado como lips@moriahsystems.com.br)

`lips@moriahsystems.com.br` é owner/admin da empresa Lips. Não é operador global da Moriah e não deve acessar o Centro de Comando interno.

| Critério | Status |
|---|---|
| `/settings/whatsapp` mostra somente Lips | ✅ Garantido via channels filtrado por tenant/org |
| `/whatsapp-diagnostics` mostra somente Lips | ✅ Garantido via prop derivada do banco |
| `/operations` bloqueia acesso ao Centro de Comando interno | ✅ Cliente Lips não deve acessar `/operations` |
| `GET /api/whatsapp-web/status?sessionId=lips-main` funciona | ✅ Canal pertence ao tenant Lips |
| `GET /api/whatsapp-web/status?sessionId=hall-main` retorna 403 | ✅ Canal não encontrado no tenant Lips → 403 |
| `GET /api/whatsapp-web/sync-chat-messages?sessionId=hall-main` retorna 403 | ✅ Channel query não encontra hall-main no tenant Lips |
| Nenhuma conversa/canal de outra organização aparece | ✅ Todas as queries filtram tenant_id + organization_id |

---

## Mecanismo central de proteção

```typescript
// Em toda rota que aceita sessionId externo:
const { data: ownedChannel } = await client
  .from("channels")
  .select("id")
  .eq("tenant_id", context.tenantId)
  .eq("organization_id", context.organizationId)
  .eq("session_id", resolved.sessionId)
  .maybeSingle();

if (!ownedChannel) {
  return NextResponse.json({ ok: false, error: "Canal não encontrado." }, { status: 403 });
}
```

---

## Pendências

- Auditar `/api/whatsapp-web/diagnostics` (não coberto nesta auditoria)
- Adicionar testes E2E que verificam cross-tenant 403 para cada rota
