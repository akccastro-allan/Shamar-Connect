# Checklist de Operação — Hall Donous e Lips

Guia passo a passo para colocar e manter as duas unidades operando no ShamarConnect.

---

## Sessões disponíveis

| Sessão | Unidade |
|--------|---------|
| `hall-main` | Hall Donous |
| `lips-main` | Lips |

---

## 1. Como conectar Hall Donous

1. Acesse `/settings/whatsapp`
2. Clique no card **Hall Donous** (sessão `hall-main`)
3. Clique em **Conectar**
4. Aguarde o QR aparecer ou clique em **Mostrar QR Code**
5. No celular do Hall: WhatsApp → três pontos → **Dispositivos conectados** → **Conectar dispositivo**
6. Escaneie o QR Code exibido na tela
7. Aguarde o status mudar para `authenticated` e depois `ready`

---

## 2. Como conectar Lips

1. Acesse `/settings/whatsapp`
2. Clique no card **Lips** (sessão `lips-main`)
3. Repita os mesmos passos 3–7 acima com o celular do Lips

---

## 3. Como gerar QR Code

Via interface:
- `/settings/whatsapp` → selecione a unidade → clique **Mostrar QR Code**

Via API:
```
GET /api/whatsapp-web/pairing-code?sessionId=hall-main
GET /api/whatsapp-web/pairing-code?sessionId=lips-main
```

O QR expira em aproximadamente 60 segundos. Se expirar antes de escanear, clique novamente em **Mostrar QR Code**.

---

## 4. Como validar se está `ready`

Via interface:
- `/settings/whatsapp` → selecione a unidade → verifique o badge de status
- Status `ready` = conectado e operacional

Via API:
```
GET /api/whatsapp-web/status?sessionId=hall-main
GET /api/whatsapp-web/status?sessionId=lips-main
```

Resposta esperada:
```json
{ "status": "ready", "phone": "5521...", "provider": "whatsapp_web" }
```

---

## 5. Como sincronizar chats

Via interface:
- `/whatsapp-diagnostics` → selecione a unidade → clique **Sincronizar conversas**

Via API:
```
GET /api/whatsapp-web/sync-chat-messages?sessionId=hall-main&chatLimit=20&limit=30
GET /api/whatsapp-web/sync-chat-messages?sessionId=lips-main&chatLimit=20&limit=30
```

Parâmetros:
- `chatLimit`: quantas conversas buscar do gateway
- `limit`: quantas mensagens por conversa

---

## 6. Como sincronizar mensagens de um chat específico

Via API:
```
GET /api/whatsapp-web/chats/{chatId}/messages?sessionId=hall-main
```

Substitua `{chatId}` pelo `external_chat_id` da conversa (ex: `5521999999999@c.us`).

---

## 7. Como rodar o watchdog

O watchdog verifica conversas paradas e atualiza `requires_human` e `sla_status`.

Via interface:
- `/whatsapp-diagnostics` → clique **Rodar watchdog**

Via API:
```
GET /api/whatsapp-web/watchdog?staleMinutes=5
```

- `staleMinutes`: minutos sem resposta para marcar como `requires_human` (padrão: 5)

Execute o watchdog antes de cada turno de atendimento para garantir que a fila está atualizada.

---

## 8. Como testar envio manual

Via central de atendimento:
1. Acesse `/whatsapp-messages`
2. Abra uma conversa existente
3. Digite uma mensagem e envie

Via API (necessita token de auth):
```
POST /api/whatsapp-messages/conversations/{conversationId}/send
Content-Type: application/json

{ "message": "Olá, teste de envio." }
```

Verifique no celular que a mensagem chegou.

---

## 9. Como validar que grupos não recebem bot

**Regra absoluta**: grupos nunca recebem resposta automática.

Para validar:
1. Acesse `/whatsapp-diagnostics` → selecione a sessão → clique **Automação dryRun**
2. Verifique o resultado: conversas com `is_group = true` devem aparecer como `skipped`
3. Em **Últimas mensagens automáticas enviadas**, confirme que nenhum `to_id` termina em `@g.us`

Via banco (conferência manual):
```sql
SELECT external_chat_id, body, created_at
FROM whatsapp_messages
WHERE direction = 'outbound'
  AND created_at > now() - interval '24h'
  AND external_chat_id LIKE '%@g.us';
```
Resultado esperado: **zero linhas**.

---

## 10. Como saber que está pronto para operar

Checklist de prontidão:

- [ ] `/settings/whatsapp` → hall-main: status `ready`
- [ ] `/settings/whatsapp` → lips-main: status `ready`
- [ ] `/whatsapp-diagnostics` → hall-main: gateway `Online`, sem erro
- [ ] `/whatsapp-diagnostics` → lips-main: gateway `Online`, sem erro
- [ ] Sync de chats executado na última hora
- [ ] Watchdog executado antes do turno
- [ ] `/operations` → Hall e Lips aparecem como `ready` no dashboard
- [ ] Nenhum grupo com envio automático nas últimas 24h

Quando todos os itens estão marcados, a operação está pronta.

---

## URLs de referência rápida

| Tela | URL |
|------|-----|
| Conectar WhatsApp | `/settings/whatsapp` |
| Diagnóstico | `/whatsapp-diagnostics` |
| Central de atendimento | `/whatsapp-messages` |
| Operações (Allan) | `/operations` |
| Suporte | `/support` |

---

## Limitação conhecida: dados misturados por organização

O diagnóstico (`/api/whatsapp-web/diagnostics`) filtra conversas por `tenant_id` e `organization_id`, não por `session_id`. Isso significa que as contagens de conversas em `/whatsapp-diagnostics` refletem **toda a organização**, não somente a sessão selecionada.

Impacto: as contagens de Hall e Lips mostram o total da organização compartilhada.  
Mitigação: o `channel_id` nas conversas permite distinguir por canal. Um filtro de `channel_id` pode ser adicionado às queries de diagnóstico numa sprint futura.
