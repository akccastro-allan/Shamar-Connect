# Hall Donous & Lips — Go-live Checklist

**Última revisão:** 2026-06-19
**Status do sistema:** ✅ Pronto para conexão

---

## Status pré-conexão

| Item | Status |
|------|--------|
| Auth — login/logout | ✅ |
| Sessões isoladas por channel_id | ✅ |
| Migration 0014 aplicada (channels hall/lips) | ✅ |
| Diagnóstico filtra por sessão | ✅ |
| Automação aceita sessionId | ✅ |
| Automação usa gateway correto por sessão | ✅ |
| Grupos nunca recebem resposta automática | ✅ |
| Build + TypeScript limpos | ✅ |
| Hall conectado (QR escaneado) | ⬜ |
| Lips conectado (QR escaneado) | ⬜ |

---

## 1. Conectar Hall Donous

1. Acesse `/settings/whatsapp`
2. Selecione **Hall Donous** → clique **Conectar**
3. Aguarde o QR Code aparecer
4. No celular do Hall: WhatsApp → Dispositivos conectados → Escanear QR
5. Status deve mudar para `ready` ou `authenticated`
6. Confirme em `/whatsapp-diagnostics?session=hall-main`

**Esperado:**
```
Gateway: Online
Status: ready
Telefone: +55 (número do Hall)
```

---

## 2. Conectar Lips

1. Acesse `/settings/whatsapp`
2. Selecione **Lips** → clique **Conectar**
3. Mesmo fluxo com o celular do Lips
4. Confirme em `/whatsapp-diagnostics?session=lips-main`

**Importante:** Conectar Lips NÃO afeta Hall. São sessões e gateways independentes.

---

## 3. Primeiro sync de conversas

Após conectar, rodar sync para trazer o histórico:

```
GET /api/whatsapp-web/sync-chat-messages?sessionId=hall-main&chatLimit=20&limit=30
GET /api/whatsapp-web/sync-chat-messages?sessionId=lips-main&chatLimit=20&limit=30
```

Ou via `/whatsapp-diagnostics?session=hall-main` → **Sincronizar conversas**

As conversas agora são tagueadas com `channel_id` correto ao sincronizar — Hall e Lips ficam separados mesmo compartilhando a mesma organização no banco.

---

## 4. Validar isolamento após sync

```sql
-- Confirmar que conversas estão separadas por channel
select c.session_id, count(wc.id) as conversas
from channels c
left join whatsapp_conversations wc on wc.channel_id = c.id
where c.session_id in ('hall-main', 'lips-main')
group by c.session_id;
```

Esperado: dois rows separados com contagens distintas.

---

## 5. Validar que grupos não recebem bot

**Via dryRun (sempre usar antes da primeira automação real):**
```
GET /api/whatsapp-web/automation/process?sessionId=hall-main&dryRun=1&limit=20
GET /api/whatsapp-web/automation/process?sessionId=lips-main&dryRun=1&limit=20
```

Verificar em `skippedItems`: grupos devem aparecer com `skippedReason: "group_lead_source_only"`.
Verificar que `items` não contém nenhuma conversa com `external_chat_id` terminando em `@g.us`.

---

## 6. Testar envio manual

1. Acesse `/whatsapp-messages`
2. Selecione uma conversa
3. Digite e envie uma mensagem
4. Confirme que chegou no celular

SLA deve limpar: `sla_status = ok`, `requires_human = false`.

---

## 7. Monitorar via Operations

`/operations` → cards Hall Donous e Lips mostram:
- Status do gateway (`ready` / `offline`)
- Conversas totais por sessão
- Precisa humano
- SLA estourado

Atualiza automaticamente a cada 30s.

---

## 8. Watchdog

Rodar antes de cada turno:
```
GET /api/whatsapp-web/watchdog?staleMinutes=5
```

Ou `/whatsapp-diagnostics?session=hall-main` → **Rodar watchdog**

---

## 9. Checklist de prontidão operacional

**Hall está pronto quando:**
- [ ] Status `ready` confirmado em `/whatsapp-diagnostics?session=hall-main`
- [ ] Sync retornou conversas
- [ ] dryRun mostra conversas sendo processadas corretamente, grupos skipped
- [ ] Envio manual testado (mensagem chegou no celular)
- [ ] Watchdog roda sem erros

**Lips está pronto quando:**
- [ ] Status `ready` confirmado em `/whatsapp-diagnostics?session=lips-main`
- [ ] Sync retornou conversas do número do Lips
- [ ] dryRun limpo
- [ ] Envio manual testado

---

## 10. O que NÃO fazer

- ❌ Não rodar automação real (`without dryRun=1`) antes do dryRun validado
- ❌ Não responder grupos com bot — regra absoluta, bloqueado no código
- ❌ Não fazer disparo em massa — campanhas são somente leitura
- ❌ Não fazer PR para main sem testar em preview

---

## Limitações remanescentes (pós 2026-06-19)

1. **Mesmo contato em Hall e Lips** — se o mesmo número de telefone aparecer nas duas sessões, o registro em `crm_contacts` é compartilhado (upsert por phone). A conversa fica separada por `channel_id`. Comportamento documentado, não é blocker.

2. **Modo de automação global** — não há toggle por sessão. Copilot/Assistido é o mesmo para todas as sessões.

3. **Automação para Lips** — a rota aceita `?sessionId=lips-main` e usa o gateway correto, mas o fluxo de automação (textos, menu, intenções) foi calibrado para Hall. Validar se os textos fazem sentido para Lips antes de ativar automação nessa sessão.
