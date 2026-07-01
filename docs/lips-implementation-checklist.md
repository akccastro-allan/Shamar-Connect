# Lips Auto Center — Checklist de Implantação

Tenant: `e6abeaae-29fc-4186-b56a-361a69cb846d`
Org:    `8f074193-bf58-4537-9842-720619a9f259`
Sessão WhatsApp: `lips-main`

---

## 0. Pré-requisitos (plataforma)

- [ ] Tenant Lips criado e ativo no banco central (`lquozwwszboxkmymzjcs`)
- [ ] Assinatura ativa (`tenant_subscriptions.status = 'active'`)
- [ ] Sessão `lips-main` conectada no Railway (WhatsApp escaneado)
- [ ] Canal `lips-main` registrado em `messaging_channels` (`organization_id = 8f074193`)
- [ ] ENV var obrigatória no Vercel:
  - `SHAMAR_AGENT_SETUP_TOKEN` — token para ativação inicial do Shamar Agent

---

## 1. Migrations SQL (rodar no SQL Editor do Supabase)

### Migration 0027 — catálogo e agente (fundação)
Arquivo: `supabase/migrations/0027_catalog_integration_foundation.sql`
- [x] Executada em produção

### Migration 0028 — campos extras de catálogo e agente
Arquivo: `supabase/migrations/0028_catalog_agent_extra_fields.sql`
- [x] Executada em produção

### Migration 0029 — stock_available numeric
Arquivo: `supabase/migrations/0029_fix_stock_available_numeric.sql`
- [x] Executada em produção

---

## 2. Setup operacional (endpoint idempotente)

```bash
POST /api/admin/setup-lips
Content-Type: application/json
{ "tenantId": "e6abeaae-29fc-4186-b56a-361a69cb846d",
  "organizationId": "8f074193-bf58-4537-9842-720619a9f259" }
```

Requer sessão de admin da plataforma. Pode ser chamado mais de uma vez sem duplicar dados.

- [ ] Executar após migrations
- [ ] Confirmar resposta: `ok: true`, departamentos criados, respostas rápidas criadas

### Departamentos criados
| Nome | Cor | Uso |
|------|-----|-----|
| Balcão | `#2ABFAB` | Peças, preços, estoque |
| Oficina | `#C9952A` | Serviços, agendamento |
| Supervisão | `#1B2F5B` | Escalações, gerencial |
| Geral | `#94a3b8` | Triagem, não classificado |

### Respostas rápidas (10)
`saudacao`, `pedir_ano`, `pedir_modelo`, `pedir_compatibilidade`, `encaminhar_balcao`,
`encaminhar_oficina`, `fora_horario`, `preco_estoque`, `produto_nao_encontrado`, `confirmar_setor`

---

## 3. Shamar Agent Windows (sync local do CPlus)

O sync do catálogo CPlus → Shamar Connect é feito pelo **Shamar Agent rodando localmente
na máquina Windows da Lips**. Não depende de cron no Vercel.

### Ativação do agente (uma vez)
```
POST /api/agents/activate
Authorization: Bearer $SHAMAR_AGENT_SETUP_TOKEN
{ "organizationId": "...", "agentName": "Lips-Agent-1",
  "machineName": "...", "operatingSystem": "...", "agentVersion": "1.0.0" }
```
- [ ] Executar no primeiro boot do Agent
- [ ] Guardar o `agentToken` retornado como `SHAMAR_AGENT_TOKEN` no `.env` local do Agent
- [ ] Não commitar o token em nenhum arquivo

### Agendamento local (Fase 1)
O Agent Windows faz sync nos horários configurados (`SYNC_SCHEDULED_TIMES=12:00,17:00`,
horário de Brasília). Não é necessário nenhum cron externo para a implantação inicial.

- [ ] Agent configurado e rodando
- [ ] Heartbeat batendo (verificar logs do Agent)
- [ ] Primeiro sync executado — conferir `catalog_items` no banco

### Catálogo — status de frescor
| Estado | Critério |
|--------|---------|
| `fresh` | Sincronizado há ≤ 12h |
| `attention` | Sincronizado há ≤ 48h |
| `stale` | Sincronizado há > 48h |

---

## 3.5. Atendimento assistido — MVP (fase 1)

**IMPORTANTE:** A Lips implanta com **atendimento assistido**, não automático.

### Fluxo MVP
1. **Cliente envia mensagem** → recebida no WhatsApp
2. **Atendente abre Central** → vê a conversa + painel de catálogo
3. **Painel sugere resposta** (via `/api/catalog/assist`):
   - Detecta intenção (peça/serviço)
   - Retorna departamento (Balcão/Oficina)
   - Mostra SLA como orientação
   - Busca produto no catálogo (preço, estoque)
4. **Atendente revisa sugestão** → pode editar
5. **Atendente envia manualmente** → via botão "Enviar"

### Automações desabilitadas (fase futura)
- ❌ `/api/whatsapp-web/automation/process` — resposta automática
- ❌ `/api/cron/outbox` — envio de fila automático (não confiável em Vercel free)
- ❌ Conversation flows com trigger automático
- ❌ Qualquer envio sem clique do atendente

**Razão:** MVP deve ser confiável — não podemos depender de cron do Vercel ou workers em background.

### O que funciona no MVP
- ✅ Sugestão de resposta (painel CatalogAssistPanel)
- ✅ Busca por produto com sinônimos
- ✅ Roteamento automático para departamento (apenas exibição)
- ✅ SLA como guia visual (sem notificação automática)
- ✅ Envio manual supervisionado

---

## 4. SLA operacional (regra humana, não automática)

O SLA abaixo é uma **regra operacional** exibida no assistente de catálogo da Central de
Atendimento. **Não há notificação automática** nesta fase — é guia para o atendente.

| Departamento | SLA | Escalação |
|---|---|---|
| Balcão | 30 min dentro do horário comercial | Supervisor |
| Oficina | 50 min dentro do horário comercial | Supervisor |
| Geral | 60 min dentro do horário comercial | Supervisor |

**Horário comercial:**
- Segunda a sexta: 08:00–18:00
- Sábado: 08:00–15:00
- Domingo: Fechado

### `/api/cron/lips-sla` — fase futura
O endpoint existe e está funcional, mas **não é obrigatório para a implantação inicial**.
Ele pode ser acionado manualmente ou por um scheduler externo futuro (GitHub Actions, etc.)
quando houver necessidade de escalação automática com notificação.

```
POST /api/cron/lips-sla
Authorization: Bearer $CRON_SECRET
```

Sem `CRON_SECRET` configurado, o endpoint retorna 401 e não afeta nada mais no sistema.

---

## 5. Variáveis de ambiente

### Obrigatórias para implantação inicial
| Variável | Onde | Uso |
|---|---|---|
| `SHAMAR_AGENT_SETUP_TOKEN` | Vercel | Token de bootstrap do agente (uma vez) |

### Opcionais / fase futura
| Variável | Onde | Uso |
|---|---|---|
| `CRON_SECRET` | Vercel | Protege `/api/cron/lips-sla` quando ativado |

---

## 6. Testes manuais

### Catálogo (no console do browser, logado como admin)
```js
// Busca
await fetch("/api/catalog/search?q=filtro").then(r => r.json())
// ou POST
await fetch("/api/catalog/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "filtro" })
}).then(r => r.json())

// Assistente
await fetch("/api/catalog/assist", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: "preciso de filtro de óleo para Corolla 2020" })
}).then(r => r.json())
```

Resultado esperado antes do primeiro sync: `items: []`, `freshness: "unknown"`.
Resultado esperado após sync: itens do CPlus aparecem, `freshness: "fresh"`.

### Setup operacional
```js
await fetch("/api/admin/setup-lips", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    tenantId: "e6abeaae-29fc-4186-b56a-361a69cb846d",
    organizationId: "8f074193-bf58-4537-9842-720619a9f259"
  })
}).then(r => r.json())
```

---

## 7. Rollback / pontos de atenção

- Migrations são aditivas — sem risco de perda de dados
- `setup-lips` é idempotente — pode rodar mais de uma vez
- Sem `CRON_SECRET`: endpoint de SLA retorna 401, o resto do sistema não é afetado
- Sem `SHAMAR_AGENT_TOKEN` no Agent: heartbeat e sync são pulados (logs avisam)
- Catálogo vazio antes do primeiro sync é comportamento esperado — assistente retorna `items: []`
- **Automações automáticas desabilitadas** para Lips MVP — botão "Automação dryRun" não aparece em `/whatsapp-diagnostics?session=lips-main`
- Se tentar chamar `/api/whatsapp-web/automation/process` manualmente para Lips: **funciona, mas não deve ser feito** — sempre supervise manualmente

---

## 8. Fase 2 (futuro)

Quando a Lips estiver estável (>1 semana operando), próximas melhorias:

- [ ] Automação com supervisão (`/api/whatsapp-web/automation/process` com approval queue)
- [ ] Fila de outbox confiável (alternativa a Vercel Cron: GitHub Actions ou webhook externo)
- [ ] SLA automático com notificação para supervisor (vai precisar `CRON_SECRET`)
- [ ] Conversation flows com trigger automático (agendamento)
- [ ] Meta API oficial (substituir WhatsApp Web)

Fase 2 começa **após feedback real de 7+ dias**.
