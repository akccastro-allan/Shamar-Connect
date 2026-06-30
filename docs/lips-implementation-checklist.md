# Lips Auto Center — Checklist de Implantação

Tenant: `e6abeaae-29fc-4186-b56a-361a69cb846d`
Org:    `8f074193-bf58-4537-9842-720619a9f259`
Sessão WhatsApp: `lips-main`
Branch: `fix/connect-agent-lips-viciados`

---

## 0. Pré-requisitos (plataforma)

- [ ] Tenant Lips criado e ativo no banco central (`lquozwwszboxkmymzjcs`)
- [ ] Assinatura ativa (`tenant_subscriptions.status = 'active'`)
- [ ] Sessão `lips-main` conectada no Railway (WhatsApp escaneado)
- [ ] Canal `lips-main` registrado em `messaging_channels` (`organization_id = 8f074193`)
- [ ] ENV vars de produção (Vercel) atualizadas:
  - `CRON_SECRET` — para o cron externo de SLA
  - `OPENAI_TRANSCRIPTION_MODEL` — ex: `whisper-1`

---

## 1. Migrations SQL (rodar no SQL Editor do Supabase)

### Migration 0027 — catálogo e agente (fundação)
Arquivo: `supabase/migrations/0027_catalog_integration.sql`
- [ ] Executar no projeto `bbcxqvgdsdntwojjpwoz`
- Cria: `catalog_categories`, `catalog_items`, `integration_sources`, `integration_agents`

### Migration 0028 — campos extras de catálogo e agente
Arquivo: `supabase/migrations/0028_catalog_agent_extra_fields.sql`
- [ ] Executar **após** 0027
- Adiciona: `promotional_price`, `cost_price`, `unit`, `stock_available`, `is_active`, `is_available` em `catalog_items`
- Adiciona: `name`, `machine_name`, `operating_system`, `agent_version` em `integration_agents`
- Cria índices de performance

---

## 2. Setup operacional (endpoint idempotente)

```bash
POST /api/admin/setup-lips
Content-Type: application/json
{ "tenantId": "e6abeaae-29fc-4186-b56a-361a69cb846d",
  "organizationId": "8f074193-bf58-4537-9842-720619a9f259" }
```

Requer sessão de admin da plataforma.
Cria (sem duplicar): departamentos, pipeline, respostas rápidas.

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
`saudacao`, `pedir_ano`, `pedir_modelo`, `pedir_compatibilidade`, `encaminhar_balcao`, `encaminhar_oficina`, `fora_horario`, `preco_estoque`, `produto_nao_encontrado`, `confirmar_setor`

---

## 3. Agente Shamar (Shamar-Agent)

### Bootstrap do agente
```bash
POST /api/agents/activate      # ou /api/integrations/agent/bootstrap
Authorization: Bearer $SHAMAR_AGENT_SETUP_TOKEN
{ "organizationId": "8f074193-...", "agentName": "Lips-Agent-1",
  "machineName": "...", "operatingSystem": "...", "agentVersion": "1.0.0" }
```
- [ ] Guardar o `agentToken` retornado no `.env` do Shamar-Agent como `SHAMAR_AGENT_TOKEN`
- [ ] Não commitar o token em nenhum arquivo

### Sync de catálogo (CPlus → Shamar)
```bash
POST /api/agents/sync          # ou /api/integrations/agent/sync/catalog
Authorization: Bearer $SHAMAR_AGENT_TOKEN
{ "organizationId": "...", "items": [...] }
```
- [ ] Testar sync com 5 itens
- [ ] Conferir `catalog_items` no banco com `organization_id` correto
- [ ] Status de frescor esperado: `fresh` (≤12h), `attention` (≤48h), `stale` (>48h)

### Heartbeat
```bash
POST /api/agents/heartbeat
Authorization: Bearer $SHAMAR_AGENT_TOKEN
{ "organizationId": "..." }
```
- [ ] Agente deve bater heartbeat a cada ~5 min

---

## 4. Central de atendimento

### Horário comercial configurado
| Dia | Horário |
|-----|---------|
| Segunda–Sexta | 08:00–18:00 |
| Sábado | 08:00–15:00 |
| Domingo | Fechado |

### SLA por departamento
| Departamento | SLA |
|---|---|
| Balcão | 30 min |
| Oficina | 50 min |
| Geral | 60 min |

### Cron de SLA
Endpoint: `POST /api/cron/lips-sla`
Header: `Authorization: Bearer $CRON_SECRET`
- [ ] Configurar GitHub Actions (ou similar) para chamar a cada 10–15 min nos dias de semana
- [ ] O endpoint já verifica horário comercial e pula se fora do horário

---

## 5. Feature flags

### Meta Channels (não aplicável à Lips no MVP)
A Lips usa WhatsApp Web (`lips-main`), não Meta API.
`meta_channels` flag deve estar **ausente ou false** no metadata do tenant.

### Catálogo inteligente
Visível para todos na Central de Atendimento → aba "Catálogo inteligente" no painel direito.
Nenhuma flag necessária — escopo por `organization_id` já garante isolamento.

---

## 6. Testes manuais

### Catálogo
- [ ] Enviar mensagem de cliente com nome de peça → assistente deve identificar intent `parts` e retornar itens
- [ ] Enviar mensagem sobre serviço → intent `workshop`, departamento `Oficina`, SLA 50 min
- [ ] Enviar mensagem fora do horário → `outOfHoursMessage` preenchido
- [ ] Clicar "Usar esta resposta" → campo de resposta da Central preenchido

### SLA
- [ ] Deixar conversa aberta por mais de 30 min → cron deve marcar `sla_status = 'overdue'`
- [ ] Confirmar que conversa encerrada/finalizada não é afetada

### Respostas rápidas
- [ ] Buscar "saudacao" → deve aparecer
- [ ] Clicar → texto vai para o campo de resposta
- [ ] Enviar → mensagem enviada pelo WhatsApp

---

## 7. Rollback / pontos de atenção

- Migrations são aditivas (`ADD COLUMN IF NOT EXISTS`) — não há risco de perda de dados
- `setup-lips` é idempotente — pode rodar mais de uma vez sem duplicar
- Agente token: se perdido, recriar com novo bootstrap (token antigo é invalidado no banco)
- SLA cron: se `CRON_SECRET` não estiver setado, o endpoint retorna 401 silenciosamente

---

## 8. Contato de suporte

Allan Castro — Moriah Systems
Qualquer dúvida sobre configuração do Shamar-Agent: ver `docs/ops/shamar-agent-setup.md` (a criar)
