# Operações WhatsApp — ShamarConnect

## 1. Conectar o WhatsApp Hall

1. Acesse `/settings/whatsapp` no menu lateral.
2. Clique em **Verificar status**. Se aparecer "disconnected", clique em **Conectar**.
3. Escaneie o QR Code com o WhatsApp do celular usado como número comercial.
4. Aguarde o status mudar para "connected" ou "authenticated".
5. O gateway Railway mantém a sessão ativa. Reconecte se o celular reiniciar ou o WhatsApp deslogar.

---

## 2. Testar status do gateway

```
GET /api/whatsapp-web/status
```

Retorna:
```json
{ "status": "connected", "sessionId": "hall-main", "phone": "..." }
```

Ou use a tela `/whatsapp-diagnostics` → botão **Carregar diagnóstico**.

---

## 3. Sincronizar mensagens

**Via tela:**
- Acesse `/whatsapp-messages`
- Selecione a conversa → clique **Sincronizar histórico**

**Via API:**
```
POST /api/whatsapp-web/chats/import-history
{ "chatId": "5521999999999@c.us", "limit": 100 }
```

**Sincronizar todas as conversas recentes:**
```
POST /api/whatsapp-web/sync-chats
```

---

## 4. Importar contatos de grupo

**Via tela:**
- Acesse `/whatsapp-import`
- Selecione o grupo no seletor
- Clique **Importar contatos deste grupo** — salva direto no CRM como contatos com `source=whatsapp_group`
- Ou clique **Exportar para lista rascunho** — cria lista de revisão antes de qualquer ação

**Via API (um grupo específico):**
```
GET /api/whatsapp-web/sync-group-contacts?groupId=<id>
```

**Via API (todos os grupos, limite 20):**
```
POST /api/whatsapp-web/sync-group-contacts
{ "groupLimit": 20 }
```

---

## 5. Rodar watchdog

O watchdog verifica quais conversas estão sem resposta e atualiza `requires_human`, `sla_status` e `sla_due_at`.

**Via tela:** `/whatsapp-diagnostics` → **Rodar watchdog**

**Via API:**
```
GET /api/whatsapp-web/watchdog?staleMinutes=5
```

Parâmetros:
- `staleMinutes` (1–240): minutos para considerar SLA estourado (padrão: 15)
- `limit` (1–1000): máximo de conversas verificadas (padrão: 500)

---

## 6. Rodar automação em dryRun

```
GET /api/whatsapp-web/automation/process?dryRun=1&limit=20
```

Retorna o que *seria* feito sem enviar nada. Inspecione `items` e `skippedItems`.

**Execução real com limite seguro:**
```
GET /api/whatsapp-web/automation/process?limit=1
```

Processa apenas a conversa mais recente.

---

## 7. Regras de segurança

### Grupos nunca recebem resposta automática
- `is_group = true` ou `external_chat_id` terminando em `@g.us` → automação pula completamente
- Evento registrado: `automation.group_skipped`
- Campo: `pending_reason = group_lead_source_only`
- Grupos são usados somente para captação de leads

### Não apagar mensagens
- Nunca deletar registros de `whatsapp_messages`
- Sincronizações usam `upsert` com `onConflict: external_message_id`

### Não duplicar resposta automática
- Antes de responder, a automação verifica se já existe evento `safe_automation` com o mesmo `latestInboundId`
- Se já existe, a conversa vai para `skippedItems` com `reason: already_processed_latest_inbound`

### Bot não resolve conversa sozinho
- Quando `requiresHuman = true`, a automação mantém o flag
- Apenas envio humano limpa `requires_human`, `sla_status`, `pending_reason`
- Nenhuma rotina automaticamente marca conversa como "resolvida"

### Não arquivar automaticamente
- O status `archived` nunca é definido por automação ou watchdog

---

## 8. Rotas importantes

| Rota | Descrição |
|---|---|
| `/whatsapp-messages` | Central de atendimento operacional |
| `/whatsapp-diagnostics` | Diagnóstico do gateway, filas e eventos |
| `/whatsapp-import` | Importar histórico e contatos de grupos |
| `/settings/whatsapp` | Conectar gateway, QR Code |
| `/settings/whatsapp-automation` | Ver regras e textos da automação |
| `/campaigns` | Segmentos CRM para campanhas |
| `GET /api/whatsapp-web/status` | Status do gateway |
| `GET /api/whatsapp-web/watchdog` | Verificar SLA de todas as conversas |
| `GET /api/whatsapp-web/automation/process?dryRun=1` | Simular automação sem enviar |
| `POST /api/whatsapp-web/sync-chats` | Sincronizar conversas recentes |
| `POST /api/whatsapp-web/chats/import-history` | Salvar histórico de uma conversa |
| `POST /api/whatsapp-web/sync-group-contacts` | Importar participantes de grupo como contatos |
| `GET /api/whatsapp-web/diagnostics` | Resumo operacional completo |

---

## 9. Fluxo operacional recomendado (diário)

1. Verificar `/whatsapp-diagnostics` → ver se gateway está online
2. Rodar watchdog (`staleMinutes=5`) para atualizar SLA
3. Acessar `/whatsapp-messages` → usar filtro **Atrasadas** ou **Precisa humano**
4. Clicar **Atender próximo** para selecionar a conversa mais prioritária
5. Responder manualmente pela central
6. Ao final do dia: importar novos grupos → `/whatsapp-import`
