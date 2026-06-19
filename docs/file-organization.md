# Organização de Arquivos — ShamarConnect

Convenção para arquivos existentes e novos. Qualquer arquivo que eu criar segue estas regras.
Arquivos antigos fora do lugar são migrados quando forem tocados (não de uma vez, para não quebrar imports).

---

## `/docs` — Documentação

```
docs/
  ops/            Guias operacionais (como fazer X na operação real)
  strategy/       Estratégia, roadmap, prioridades
  architecture/   Decisões técnicas, multi-canal, segurança
  features/       Specs de funcionalidades
  integrations/   Integrações externas (Asaas, Shamar Agent, etc.)
  blog/           Editorial e calendário de conteúdo
  decisions/      ADRs (Architecture Decision Records)
  ux/             Referências de UX e UI
```

### Onde fica cada doc atual

| Arquivo atual | Categoria | Mover para |
|---|---|---|
| `hall-lips-operation-checklist.md` | ops | `docs/ops/hall-lips-operation-checklist.md` |
| `real-world-feedback.md` | ops | `docs/ops/real-world-feedback.md` |
| `hall-lips-go-live-checklist.md` | ops | `docs/ops/hall-lips-go-live-checklist.md` |
| `whatsapp-operations.md` | ops | `docs/ops/whatsapp-operations.md` |
| `system-test.md` | ops | `docs/ops/system-test.md` |
| `content-strategy.md` | strategy | `docs/strategy/content-strategy.md` |
| `pilot-companies.md` | strategy | `docs/strategy/pilot-companies.md` |
| `roadmap/prioridades-shamarconnect.md` | strategy | `docs/strategy/prioridades.md` |
| `multi-channel-architecture.md` | architecture | `docs/architecture/multi-channel.md` |
| `messaging-providers.md` | architecture | `docs/architecture/messaging-providers.md` |
| `security-access-and-webhooks.md` | architecture | `docs/architecture/security.md` |
| `supervised-ai-whatsapp.md` | architecture | `docs/architecture/supervised-ai.md` |
| `checkout-asaas-e-regras-comerciais.md` | integrations | `docs/integrations/asaas.md` |
| `ativacao-pos-pagamento-asaas.md` | integrations | `docs/integrations/asaas-activation.md` |
| `shamar-kids-whatsapp-cloud.md` | integrations | `docs/integrations/whatsapp-cloud.md` |
| `instagram-dm-integration.md` | integrations | `docs/integrations/instagram-dm.md` |
| `content-distribution-workflow.md` | integrations | `docs/integrations/content-distribution.md` |
| `shamar-agent-integracao.md` | integrations | `docs/integrations/shamar-agent.md` |
| `blog/plano-editorial-seo-100-artigos.md` | blog | `docs/blog/plano-editorial-100.md` |
| `features/inbox.md` | features | `docs/features/inbox.md` ✓ já correto |
| `features/whatsapp-web-lab.md` | features | `docs/features/whatsapp-web-lab.md` ✓ |
| `decisions/0001-*.md` | decisions | `docs/decisions/` ✓ |

### Regra para novos docs

- Guia de como operar algo → `docs/ops/`
- Estratégia, calendário, roadmap → `docs/strategy/`
- Decisão técnica (por que usamos X) → `docs/decisions/`
- Spec de feature → `docs/features/`
- Integração externa → `docs/integrations/`
- Conteúdo/editorial → `docs/blog/`

---

## `/lib` — Lógica de negócio

```
lib/
  auth/           Sessão, contexto do usuário autenticado
  supabase/       Clientes Supabase (server, server-write, browser)
  providers/      Clientes de gateways externos (WhatsApp Web, Cloud, Telegram)
  messaging/      Abstração de envio multi-canal (tipos + roteamento)
  ai/             Lógica de IA supervisionada
  distribution/   Builder de mensagens para distribuição de conteúdo
  blog/           Dados estáticos do blog (posts, categorias)
  crm/            (futuro) lógica de CRM, segmentação, pipeline
  utils.ts        Utilitários genéricos (cn, formatadores)
  phone.ts        Normalização de telefone
```

### Regra para novos arquivos em `/lib`

| O que é | Vai para |
|---|---|
| Cliente de API externa | `lib/providers/` |
| Lógica de sessão / auth | `lib/auth/` |
| Query reutilizável de DB | `lib/[domínio]/queries.ts` |
| Tipos compartilhados | `lib/[domínio]/types.ts` |
| Funções puras de negócio | `lib/[domínio]/[nome].ts` |

---

## `/components` — UI

```
components/
  ui/             Primitivos shadcn (Button, Card, Badge, etc.)
  brand/          Logo, assets de marca
  site/           Componentes exclusivos do site público (blog, footer, etc.)
  app/            Shell, header interno, layout de app autenticado
  whatsapp/       Painéis relacionados ao WhatsApp
  crm/            Painéis de CRM, contatos, pipeline, campanhas
  inbox/          Inbox e fila de atendimento
  support/        Suporte e admin de suporte
  operations/     Operations dashboard, Allan Command Center
  admin/          Painéis administrativos internos
  distribution/   Painel de distribuição de conteúdo
  ai/             Painéis de IA e AI Lab
```

### Mapa de componentes atuais → destino correto

| Arquivo atual | Mover para |
|---|---|
| `app-shell.tsx` | `components/app/app-shell.tsx` |
| `page-header.tsx` | `components/app/page-header.tsx` |
| `metric-card.tsx` | `components/app/metric-card.tsx` |
| `operations-dashboard.tsx` | `components/operations/operations-dashboard.tsx` |
| `allan-command-center.tsx` | `components/operations/allan-command-center.tsx` |
| `whatsapp-service-center.tsx` | `components/whatsapp/service-center.tsx` |
| `whatsapp-settings-panel.tsx` | `components/whatsapp/settings-panel.tsx` |
| `whatsapp-diagnostics-panel.tsx` | `components/whatsapp/diagnostics-panel.tsx` |
| `whatsapp-automation-settings-panel.tsx` | `components/whatsapp/automation-settings-panel.tsx` |
| `whatsapp-cloud-settings-panel.tsx` | `components/whatsapp/cloud-settings-panel.tsx` |
| `whatsapp-import-panel.tsx` | `components/whatsapp/import-panel.tsx` |
| `whatsapp-import-lab-panel.tsx` | `components/whatsapp/import-lab-panel.tsx` |
| `whatsapp-reader-panel.tsx` | `components/whatsapp/reader-panel.tsx` |
| `crm/contacts-panel.tsx` | `components/crm/contacts-panel.tsx` ✓ |
| `crm/campaigns-panel.tsx` | `components/crm/campaigns-panel.tsx` ✓ |
| `crm/group-contact-lists-panel.tsx` | `components/crm/group-contact-lists-panel.tsx` ✓ |
| `pipeline-panel.tsx` | `components/crm/pipeline-panel.tsx` |
| `sales-dashboard-panel.tsx` | `components/crm/sales-dashboard-panel.tsx` |
| `contact-create-dialog.tsx` | `components/crm/contact-create-dialog.tsx` |
| `contact-import-hub-panel.tsx` | `components/crm/contact-import-hub-panel.tsx` |
| `group-extraction-panel.tsx` | `components/crm/group-extraction-panel.tsx` |
| `group-import-lists-panel.tsx` | `components/crm/group-import-lists-panel.tsx` |
| `group-lists-review-panel.tsx` | `components/crm/group-lists-review-panel.tsx` |
| `inbox/inbox-panel.tsx` | `components/inbox/inbox-panel.tsx` ✓ |
| `support-panel.tsx` | `components/support/support-panel.tsx` |
| `admin-support-panel.tsx` | `components/support/admin-panel.tsx` |
| `distribution-panel.tsx` | `components/distribution/distribution-panel.tsx` |
| `ai-lab-panel.tsx` | `components/ai/ai-lab-panel.tsx` |
| `ai-copilot-panel.tsx` | `components/ai/copilot-panel.tsx` |
| `conversation-flows-manager.tsx` | `components/ai/conversation-flows-manager.tsx` |
| `quick-replies-manager.tsx` | `components/app/quick-replies-manager.tsx` |
| `quick-replies-manager-panel.tsx` | `components/app/quick-replies-manager-panel.tsx` |
| `dashboard-operational-panel.tsx` | `components/app/dashboard-panel.tsx` |
| `system-test-panel.tsx` | `components/app/system-test-panel.tsx` |
| `ui-lab-panel.tsx` | `components/app/ui-lab-panel.tsx` |
| `feature-lab-panel.tsx` | `components/app/feature-lab-panel.tsx` |
| `conversation-list.tsx` | `components/inbox/conversation-list.tsx` |

### Regra para novos componentes

| Tipo | Vai para |
|---|---|
| Primitivo visual sem domínio | `components/ui/` |
| Painel ou tela de app autenticado | `components/[domínio]/` |
| Componente do site público | `components/site/` |
| Layout ou shell | `components/app/` |

---

## `/app` — Rotas Next.js

```
app/
  (site)/         Rotas públicas (home, blog, planos, contato, sobre)
  api/            API routes
    auth/         Login, logout
    whatsapp-*/   APIs WhatsApp
    crm/          APIs CRM
    support/      APIs de suporte
    distribution/ APIs de distribuição
    channels/     APIs de canais
    pipeline/     APIs de pipeline
  [rota]/         Páginas de app autenticado
```

### Regra para novas API routes

- Sempre em `app/api/[domínio]/[recurso]/route.ts`
- GET lista → retorna `{ ok: true, items: [] }`
- POST cria → retorna `{ ok: true, item: {} }` com status 201
- Erros → `{ ok: false, error: string }` com status adequado
- Nunca expõe stack trace

---

## Convenção geral

1. **Novos arquivos vão para a pasta certa desde o início** — não criar flat quando existe subpasta.
2. **Arquivos antigos são migrados quando tocados** — não mover tudo de uma vez.
3. **Nomes em kebab-case** para arquivos, PascalCase para componentes exportados.
4. **Um componente por arquivo** — exceto tipos/constantes pequenos.
5. **`index.ts` só quando o módulo tiver 3+ exports** — não criar barris desnecessários.
