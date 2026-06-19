# IA Supervisionada para WhatsApp — ShamarConnect

## O que é

O módulo de IA supervisionada analisa as mensagens recebidas no WhatsApp, classifica a intenção, avalia o risco, e sugere uma resposta ao atendente. **A IA nunca envia mensagens por conta própria.** O atendente humano sempre revisa e aprova antes do envio.

---

## Modos de operação

| Modo | Comportamento |
|---|---|
| `off` | IA completamente desativada. Nenhuma sugestão é gerada. |
| `copilot` | IA sugere resposta. Humano revisa e decide enviar, editar ou ignorar. **Padrão atual.** |
| `assisted` | IA pode responder chats individuais, mas com logs completos e limites rígidos. |
| `human_only` | Conversa assumida por humano. IA silenciada para aquela conversa. |

O modo padrão é `copilot`. Mudanças de modo serão implementadas em versão futura.

---

## Por que grupos são sempre bloqueados

**REGRA ABSOLUTA:** Grupos de WhatsApp são usados somente para captação de leads. A IA nunca gera sugestão para grupos, e o bot nunca envia resposta automática em grupos. Esta regra está hardcoded no helper e no endpoint e não pode ser desativada por configuração.

Detecção de grupo:
- `conversation.is_group === true`
- `external_chat_id` terminando em `@g.us`

Quando uma conversa de grupo é detectada:
- `blocked_reason = group_lead_source_only`
- Log registrado em `ai_response_logs` com `status = blocked`
- Nenhuma sugestão é retornada

---

## O que a IA não pode fazer

- Confirmar reserva ou vaga
- Confirmar pagamento (pix, boleto, cartão)
- Dar desconto ou promoção
- Cancelar serviço ou pedido
- Emitir reembolso
- Arquivar ou marcar conversa como resolvida
- Alterar dados no CRM sem registro
- Responder grupos automaticamente

---

## Níveis de risco

| Risco | Quando | O que acontece |
|---|---|---|
| `low` | Saudação, dúvida simples | Sugestão gerada normalmente |
| `medium` | Pergunta sobre disponibilidade, confirmação | Sugestão gerada com aviso |
| `high` | Pagamento, desconto, cancelamento, reclamação, jurídico | Sugestão gerada com aviso de alto risco; envio requer confirmação explícita |

---

## Fluxo de uso (Copilot)

1. Atendente abre a conversa em `/whatsapp-messages`
2. Clica em **Sugerir resposta com IA**
3. A API `POST /api/ai/whatsapp/suggest-reply` é chamada
4. Sugestão aparece com nível de risco e intenção detectada
5. Atendente escolhe:
   - **Enviar sugestão** — envia exatamente como gerado
   - **Editar** — modifica o texto e envia a versão editada
   - **Ignorar** — descarta a sugestão (log fica com `status = ignored`)
6. Se enviada, `POST /api/ai/whatsapp/send-approved` persiste a mensagem, atualiza SLA da conversa e registra evento `ai_reply_sent`

---

## Revisão de logs

Todos os logs ficam em `ai_response_logs`. Para visualizar:

**Via tela:** `/ai-lab` mostra sugestões recentes, enviadas e bloqueadas.

**Via API:**
```
GET /api/ai/logs?limit=50
GET /api/ai/logs?status=blocked
GET /api/ai/logs?status=sent
```

---

## Como testar (Viciados em Trilhas)

O helper inclui respostas seguras para contexto de turismo/aventura. Envie uma mensagem com qualquer das intenções abaixo e veja a sugestão gerada:

| Mensagem teste | Intenção detectada | Risco |
|---|---|---|
| "Boa tarde, quero saber sobre trilhas" | greeting | low |
| "Qual a dificuldade da trilha do Pico?" | difficulty | low |
| "Preciso de equipamentos para iniciante" | equipment | low |
| "É seguro para primeira vez?" | safety | low |
| "Qual o valor do passeio?" | price / quote | low |
| "Tem vaga para sábado?" | booking | high |
| "Quero cancelar minha reserva" | cancellation | high |
| "Tive um problema e quero reclamar" | complaint | high |
| "Quero pagar com pix" | booking | high |

Intenções de alto risco geram sugestão de encaminhamento para humano. O atendente ainda pode enviar, mas o sistema exige confirmação explícita (`forceHighRisk: true`).

---

## Rotas de IA

| Rota | Método | Descrição |
|---|---|---|
| `/api/ai/whatsapp/suggest-reply` | POST | Gera sugestão para uma conversa |
| `/api/ai/whatsapp/send-approved` | POST | Envia resposta aprovada pelo atendente |
| `/api/ai/logs` | GET | Lista logs de sugestões |
| `/api/ai/logs/ignore` | POST | Marca sugestão como ignorada |

---

## Tabela de log

`ai_response_logs` — campos principais:

| Campo | Descrição |
|---|---|
| `status` | suggested / approved / edited / sent / blocked / ignored / failed |
| `risk_level` | low / medium / high |
| `intent` | Intenção detectada (greeting, quote, cancellation, etc.) |
| `blocked_reason` | Motivo do bloqueio (group_lead_source_only, high_risk_topic, etc.) |
| `suggested_response` | Texto gerado pela IA |
| `final_response` | Texto realmente enviado (pode ser diferente se editado) |
| `sent_at` | Quando foi enviado |
| `reviewed_by` | UUID do atendente que aprovou (implementação futura) |
