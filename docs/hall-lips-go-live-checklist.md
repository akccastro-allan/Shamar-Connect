# Hall Donous & Lips — Go-live Checklist

## 1. Como conectar Hall Donous

1. Acesse `/settings/whatsapp`
2. Selecione **Hall Donous** no seletor de unidades
3. Clique **Conectar** → aguarde o QR Code aparecer
4. No celular do Hall: WhatsApp → Dispositivos conectados → Escanear QR
5. Status deve mudar para `ready` ou `authenticated`
6. Confirme em `/whatsapp-diagnostics` → selecione Hall Donous → clique **Diagnóstico Hall Donous**

**Esperado:**
```
Gateway: Online
Status: ready
Telefone: +55 (número do Hall)
```

---

## 2. Como conectar Lips

1. Acesse `/settings/whatsapp`
2. Selecione **Lips** no seletor de unidades
3. Clique **Conectar** → aguarde o QR Code aparecer
4. No celular do Lips: WhatsApp → Dispositivos conectados → Escanear QR
5. Status deve mudar para `ready` ou `authenticated`
6. Confirme em `/whatsapp-diagnostics` → selecione Lips → clique **Diagnóstico Lips**

**Importante:** Conectar Lips NÃO afeta Hall. São sessões independentes (`hall-main` e `lips-main`).

---

## 3. Como testar status

**Via tela:**
- `/operations` — cards de status em tempo real de Hall e Lips
- `/whatsapp-diagnostics` — selecionar unidade e carregar diagnóstico completo

**Via API:**
```
GET /api/whatsapp-web/status?sessionId=hall-main
GET /api/whatsapp-web/status?sessionId=lips-main
```

Retorno esperado (ready):
```json
{ "status": "ready", "phone": "5521...", "provider": "whatsapp_web" }
```

---

## 4. Como sincronizar mensagens

**Via tela:**
- `/whatsapp-diagnostics` → selecionar unidade → **Sincronizar conversas**
- `/whatsapp-messages` → selecionar conversa → **Sincronizar histórico**

**Via API:**
```
GET /api/whatsapp-web/sync-chat-messages?sessionId=hall-main&chatLimit=20&limit=30
GET /api/whatsapp-web/sync-chat-messages?sessionId=lips-main&chatLimit=20&limit=30
```

---

## 5. Como sincronizar contatos de grupo

**Via tela:**
- `/whatsapp-diagnostics` → selecionar unidade → **Sincronizar grupos**
- `/whatsapp-import` → selecionar grupo → **Importar contatos deste grupo**

**Via API:**
```
GET /api/whatsapp-web/sync-group-contacts?sessionId=hall-main&groupLimit=10
GET /api/whatsapp-web/sync-group-contacts?sessionId=lips-main&groupLimit=10
```

---

## 6. Como validar que grupo não recebe bot/IA

**Teste manual:**
1. Selecione uma conversa de grupo na central `/whatsapp-messages`
2. Verifique que o badge "Grupo" aparece
3. Verifique que o campo de resposta está disponível para envio HUMANO (não automático)
4. Verifique que a seção de IA mostra: _"IA desativada em grupos. Grupos são usados apenas para captação de leads."_

**Via dryRun:**
```
GET /api/whatsapp-web/automation/process?dryRun=1&limit=20
```
Verifique em `skippedItems` que grupos aparecem com `skippedReason: "group_lead_source_only"`.

---

## 7. Como rodar watchdog

**Via tela:**
- `/whatsapp-diagnostics` → **Rodar watchdog**
- `/whatsapp-messages` → **Verificar pendências**

**Via API:**
```
GET /api/whatsapp-web/watchdog?staleMinutes=5
```

Parâmetros:
- `staleMinutes=5` — considera SLA estourado se sem resposta há mais de 5 min (padrão: 15)
- `limit=500` — máximo de conversas verificadas

Retorno: `{ scannedConversations, requiresHuman, breached, pending }`

---

## 8. Como rodar automação em dryRun

**SEMPRE USE dryRun PARA TESTAR:**
```
GET /api/whatsapp-web/automation/process?dryRun=1&limit=20
```

Inspecionar `items` (o que seria respondido) e `skippedItems` (por que pulou).

**Verificar no retorno:**
- `wouldReply: true/false`
- `skippedReason: "group_lead_source_only" | "already_processed_latest_inbound" | ...`
- `isGroup: true/false`
- `requiresHuman: true/false`
- `dryRun: true`

---

## 9. Como testar resposta manual

1. Acesse `/whatsapp-messages`
2. Aguarde carregar a fila
3. Clique em **Atender próximo** ou selecione uma conversa
4. Digite a mensagem no campo de resposta
5. Clique **Enviar mensagem**
6. Verifique que a mensagem aparece na lista (cor verde = outbound)
7. Verifique que o SLA foi limpo: `sla_status = ok`, `requires_human = false`

Para grupos: responder manualmente funciona normalmente. Bot/IA são bloqueados, mas o atendente humano pode digitar e enviar.

---

## 10. Como saber se está pronto para operar

Hall está pronto quando:
- [ ] `/api/whatsapp-web/status?sessionId=hall-main` retorna `status: ready`
- [ ] Teste de envio manual funciona (mensagem chega no celular)
- [ ] Sincronização retorna conversas
- [ ] Watchdog roda sem erros
- [ ] dryRun mostra conversas sendo processadas corretamente

Lips está pronto quando:
- [ ] `/api/whatsapp-web/status?sessionId=lips-main` retorna `status: ready`
- [ ] `/operations` mostra Lips como "ready"
- [ ] Sincronização retorna conversas do número do Lips
- [ ] Teste de envio manual funciona

---

## 11. O que NÃO fazer

### Nunca
- ❌ Não rodar automação real em lote (`/api/whatsapp-web/automation/process` sem `dryRun=1`) antes de validar manualmente
- ❌ Não responder grupos com bot (regra absoluta — qualquer tentar resultará em `group_lead_source_only` no log)
- ❌ Não fazer disparo em massa (campanhas são somente leitura por enquanto)
- ❌ Não abrir PR para main sem testar em preview

### Com cuidado
- ⚠️ sessionId inválido retorna 400 — aceitos apenas `hall-main` e `lips-main`
- ⚠️ Conversas de uma sessão não se misturam com outra (tenant_id + organization_id + provider separam)
- ⚠️ Automação usa `hall-main` por padrão — Lips não tem automação ainda
- ⚠️ Watchdog opera em conversas de todas as sessões que já foram sincronizadas para o banco

---

## Limitações conhecidas

1. **Automação sempre usa `hall-main`** — a rota `/api/whatsapp-web/automation/process` não aceita `sessionId` ainda. Para Lips, usar apenas envio manual via central.

2. **Conversas não são marcadas por sessão no banco** — a tabela `whatsapp_conversations` não tem campo `session_id`. Conversas são separadas por `tenant_id + organization_id + provider + external_chat_id`. Se Hall e Lips tiverem o mesmo número como contato, podem colidir. Documentado — não é um bug crítico para MVP.

3. **Modo de automação é global** — não há configuração por sessão. Copilot/Assistido são os mesmos para todos.

4. **Lips ainda não foi sincronizado** — primeiro sync pode demorar se houver muitas conversas.
