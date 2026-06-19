# CRM Campanhas de Relacionamento

## Objetivo

Identificar segmentos de clientes para relacionamento proativo (aniversariantes, inativos, orçamentos sem retorno) e preparar mensagens personalizadas **antes** de qualquer disparo real.

Nenhuma mensagem é enviada automaticamente por este módulo.

---

## Campos adicionados em `crm_contacts`

Migration: `supabase/migrations/0006_crm_campaign_fields.sql`

| Campo | Tipo | Descrição |
|---|---|---|
| `birth_date` | `date` | Data de nascimento do cliente |
| `birthday_month` | `integer` (gerado) | Mês derivado de `birth_date` — usado em queries |
| `birthday_day` | `integer` (gerado) | Dia derivado de `birth_date` — usado em queries |
| `last_purchase_at` | `timestamptz` | Última compra registrada |
| `last_service_at` | `timestamptz` | Último atendimento/serviço registrado |
| `last_quote_at` | `timestamptz` | Último orçamento enviado |
| `last_campaign_sent_at` | `timestamptz` | Última campanha enviada para este contato |
| `marketing_opt_in` | `boolean` | Cliente aceitou receber mensagens de marketing |
| `marketing_opt_out_at` | `timestamptz` | Quando o cliente pediu para sair da lista |
| `relationship_status` | `text` | Status de relacionamento (ex: ativo, inativo, vip) |

> `birthday_month` e `birthday_day` são colunas geradas (`GENERATED ALWAYS AS ... STORED`) — não precisam ser preenchidas manualmente.

---

## Segmentos disponíveis

Endpoint: `GET /api/crm/campaign-segments?segment=<nome>`

| Segmento | Descrição | Critério |
|---|---|---|
| `birthday_today` | Aniversariantes hoje | `birthday_month` e `birthday_day` iguais à data atual |
| `birthday_week` | Aniversariantes nos próximos 7 dias | `birthday_month/day` dentro dos próximos 7 dias |
| `inactive_30` | Inativos há 30 dias | `last_purchase_at` ou `last_service_at` antes de 30 dias atrás |
| `inactive_60` | Inativos há 60 dias | Mesmo critério, 60 dias |
| `inactive_90` | Inativos há 90 dias | Mesmo critério, 90 dias — candidatos à reativação |
| `quote_followup` | Orçamento sem fechamento | `last_quote_at` há mais de 3 dias, sem compra posterior |

O endpoint é **read-only** — não altera nenhum dado.

### Resposta

```json
{
  "ok": true,
  "segment": "birthday_today",
  "total": 3,
  "contacts": [...],
  "generatedAt": "2026-06-18T10:00:00Z"
}
```

---

## Como testar segmentos

```bash
# Aniversariantes hoje
curl /api/crm/campaign-segments?segment=birthday_today

# Inativos há 90 dias
curl /api/crm/campaign-segments?segment=inactive_90

# Orçamentos sem retorno
curl /api/crm/campaign-segments?segment=quote_followup
```

---

## Templates de mensagem (prévia)

Templates com variáveis para prévia na tela. **Nenhum disparo real.**

| Variável | Substituído por |
|---|---|
| `{{nome}}` | Nome completo do contato |
| `{{primeiro_nome}}` | Primeiro nome |
| `{{empresa}}` | Empresa do contato ou "nossa empresa" |

**Aniversário:**
```
Olá, {{primeiro_nome}}! A equipe da {{empresa}} deseja um feliz aniversário para você. Que seu dia seja muito especial! 🎉
```

**Reativação:**
```
Olá, {{primeiro_nome}}! Faz um tempinho que não falamos. Passando para saber se podemos ajudar com alguma peça, serviço ou orçamento.
```

**Follow-up de orçamento:**
```
Olá, {{primeiro_nome}}! Vi que você tinha consultado um orçamento com a gente. Ainda precisa de ajuda?
```

---

## Regras de consentimento e anti-spam

- Contatos com `marketing_opt_out_at` preenchido são **excluídos** de todos os segmentos de reativação.
- Contatos com `consent_status = 'opted_out'` também são excluídos.
- Aniversariantes **não** são filtrados por opt-out (é uma mensagem de relacionamento, não marketing).
- O campo `last_campaign_sent_at` deve ser atualizado após cada disparo real futuro para evitar reenvio.

---

## O que ainda não envia mensagem real

- Toda a lógica de segmentação é **somente leitura**.
- O botão "Preparar campanha" na tela está desabilitado — será habilitado em etapa futura.
- O disparo real exigirá:
  - Limite diário configurável
  - Confirmação manual do atendente
  - Registro de auditoria com `last_campaign_sent_at`
  - Respeito ao `marketing_opt_out_at`

---

## Tela

URL: `/campaigns`

A tela mostra 6 cards de segmento. Cada card permite:
- Ver a contagem do segmento
- Listar os contatos
- Ver a prévia da mensagem personalizada (sem enviar)

---

## Aplicar migration

```bash
supabase db push
# ou via MCP Supabase: apply_migration
```
