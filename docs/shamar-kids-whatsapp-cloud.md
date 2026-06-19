# Shamar Kids — WhatsApp Cloud API (Meta)

Canal oficial para o evento da conferência Shamar Kids (10/07).
Provider: `whatsapp_cloud`

## Por que Cloud API e não WhatsApp Web?

| | WhatsApp Web (gateway) | WhatsApp Cloud API (Meta) |
|---|---|---|
| Aprovação oficial Meta | ❌ Não oficial | ✅ Oficial |
| Adequado para uso público | ❌ Risco de ban | ✅ Sim |
| Webhooks confiáveis | Depende do gateway | ✅ Sim |
| Templates aprovados | ❌ | ✅ Necessário para proativo |
| Adequado para crianças/evento público | ❌ | ✅ Sim |

## Env vars necessárias

```env
WHATSAPP_CLOUD_ACCESS_TOKEN=        # Token permanente do usuário do sistema Meta
WHATSAPP_CLOUD_PHONE_NUMBER_ID=     # ID do número no painel Meta Business
WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID= # WABA ID
WHATSAPP_CLOUD_VERIFY_TOKEN=        # Token arbitrário para verificação de webhook
WHATSAPP_CLOUD_APP_SECRET=          # (opcional) para validar X-Hub-Signature-256
```

**Nunca** expor estas variáveis no frontend.

## URL do Webhook

```
https://seu-dominio.com/api/whatsapp-cloud/webhook
```

Cadastrar em: Meta Business → WhatsApp → Configuração → Webhook

Assinar o campo: `messages`

### Testar verificação

```bash
curl "https://seu-dominio.com/api/whatsapp-cloud/webhook\
?hub.mode=subscribe\
&hub.verify_token=SEU_VERIFY_TOKEN\
&hub.challenge=TEST123"
# Deve retornar: TEST123
```

## Templates para cadastrar na Meta

Templates precisam ser aprovados pela Meta antes de uso. Aprovação pode levar de horas a dias.
**Não há garantia de aprovação automática.**

### 1. `shamar_kids_boas_vindas`

**Categoria:** UTILITY (recomendado) ou MARKETING

**Texto:**
```
Olá, {{1}}! Aqui é o Shamar Kids. Recebemos seu contato sobre a Conferência do dia 10/07. Em breve nossa equipe vai te orientar com as informações.
```

**Parâmetros:** `{{1}}` = nome do responsável

---

### 2. `shamar_kids_confirmacao_evento`

**Categoria:** UTILITY

**Texto:**
```
Olá, {{1}}! Passando para confirmar sua participação na Conferência Shamar Kids do dia 10/07. Responda SIM para confirmar ou AJUDA para falar com nossa equipe.
```

**Parâmetros:** `{{1}}` = nome do responsável

---

### 3. `shamar_kids_lembrete_evento`

**Categoria:** UTILITY

**Texto:**
```
Olá, {{1}}! Lembrete da Conferência Shamar Kids no dia 10/07. Nossa equipe estará pronta para receber você e sua família. Qualquer dúvida, é só responder aqui.
```

**Parâmetros:** `{{1}}` = nome do responsável

---

> **Atenção:** Templates com conteúdo promocional são classificados como MARKETING pela Meta e possuem custo diferente. Templates de UTILITY (confirmações, lembretes de evento) tendem a ter aprovação mais rápida.

## Como enviar a primeira mensagem manual

1. Acesse `/whatsapp-messages` no ShamarConnect
2. Localize a conversa com `provider = whatsapp_cloud`
3. Use a central de atendimento normalmente — o envio é roteado automaticamente pelo Cloud API

Ou via API:
```bash
curl -X POST https://seu-dominio.com/api/whatsapp-cloud/messages/send \
  -H "Content-Type: application/json" \
  -H "Cookie: [sessão autenticada]" \
  -d '{"conversationId": "UUID_DA_CONVERSA", "body": "Olá!"}'
```

## Proteção de crianças — regras absolutas

| Regra | Detalhe |
|-------|---------|
| Comunicar com responsável | Nunca diretamente com crianças |
| Sem dados sensíveis no chat | CPF, RG, certidão — jamais por WhatsApp |
| IA apenas sugere | Humano revisa e aprova antes de enviar |
| Sem opt-in = sem envio | Templates proativos apenas para quem optou |
| Sem disparos em massa | Proibido pela política Meta e pelas regras do sistema |
| Grupos não respondem | Regra global do ShamarConnect |

## Fluxo técnico — mensagem inbound

```
1. Responsável envia mensagem para número Shamar Kids
2. Meta → POST /api/whatsapp-cloud/webhook
3. Webhook valida assinatura (se APP_SECRET configurado)
4. Salva provider_event (provider = whatsapp_cloud)
5. Upsert crm_contacts (phone)
6. Upsert whatsapp_conversations (provider = whatsapp_cloud, external_chat_id = phone)
7. Insert whatsapp_messages (provider = whatsapp_cloud, direction = inbound)
8. Conversa aparece em /whatsapp-messages com badge [Cloud API]
9. Atendente responde manualmente → /api/whatsapp-messages/conversations/[id]/send
10. Send route detecta provider = whatsapp_cloud → envia via Cloud API
```

## Limitações atuais

- Templates não são enviados via interface — apenas via código/curl
- Não há integração com o módulo de IA supervisionada para este canal (IA bloqueada por segurança)
- Não há painel de templates na interface — cadastro feito diretamente no Meta Business
- Status de entrega (delivered/read) chegam via webhook mas não são exibidos na interface ainda
- Business Account ID é armazenado em env var; se mudar, requer redeploy
