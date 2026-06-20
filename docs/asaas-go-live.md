# Asaas Checkout — Guia Go Live

## Status atual

O fluxo de checkout está implementado e funcional:

- **`/checkout`** — página pública com `CheckoutForm`
- **`/api/checkout/asaas`** — cria cliente + cobrança no Asaas e retorna link de pagamento
- **`/api/webhooks/asaas`** — recebe eventos do Asaas (pagamento confirmado, etc.)
- **`/checkout/sucesso`** — página de sucesso
- **`/checkout/pendente`** — página de pagamento pendente
- **`/checkout/erro`** — página de erro

---

## Variáveis de ambiente necessárias

| Variável | Descrição | Onde obter |
|---|---|---|
| `ASAAS_API_KEY` | Chave de API do Asaas | Painel Asaas → Conta → Chave API |
| `ASAAS_API_BASE_URL` | URL da API | `https://api-sandbox.asaas.com/v3` (sandbox) ou `https://api.asaas.com/v3` (produção) |

### Para sandbox (testes):
```env
ASAAS_API_KEY=$aas_xxxx...
ASAAS_API_BASE_URL=https://api-sandbox.asaas.com/v3
```

### Para produção:
```env
ASAAS_API_KEY=$aas_xxxx...
ASAAS_API_BASE_URL=https://api.asaas.com/v3
```

> Adicionar em `.env.local` (desenvolvimento) e nas variáveis de ambiente do projeto na Vercel.

---

## Planos disponíveis no checkout

| Slug | Nome | Mensalidade | Implantação |
|---|---|---|---|
| `starter` | Starter | R$ 149/mês | R$ 297 |
| `professional` | Professional | R$ 297/mês | R$ 497 |
| `business` | Business | R$ 597/mês | R$ 997 |

Adicionais: conexões WhatsApp extras, usuários extras, IA (R$ 79,90/mês).

---

## Formas de pagamento suportadas

O Asaas suporta automaticamente:
- PIX (recomendado — aprovação imediata)
- Cartão de crédito
- Boleto bancário

---

## Webhook do Asaas

### URL para configurar no painel Asaas:

```
https://www.shamarconnect.com.br/api/webhooks/asaas
```

### Eventos recomendados:
- `PAYMENT_CONFIRMED`
- `PAYMENT_RECEIVED`
- `PAYMENT_OVERDUE`
- `PAYMENT_DELETED`
- `SUBSCRIPTION_CREATED`
- `SUBSCRIPTION_UPDATED`
- `SUBSCRIPTION_DELETED`

---

## Fluxo completo

```
/planos → /checkout?plan=professional
  → CheckoutForm (cliente preenche dados)
  → POST /api/checkout/asaas
  → Cria/atualiza cliente no Asaas
  → Cria cobrança
  → Retorna { ok: true, paymentUrl, invoiceUrl }
  → Frontend redireciona para paymentUrl (página de pagamento Asaas)
  → Asaas processa pagamento
  → POST /api/webhooks/asaas (evento de confirmação)
  → Sistema atualiza status do cliente
```

---

## Como testar

1. Configure `ASAAS_API_KEY` com chave de **sandbox**
2. Configure `ASAAS_API_BASE_URL=https://api-sandbox.asaas.com/v3`
3. Acesse `/checkout?plan=professional`
4. Preencha CPF/CNPJ de teste: `000.000.001-91` (pessoa física sandbox)
5. Complete o checkout — você receberá um link de pagamento sandbox
6. No painel sandbox Asaas, confirme o pagamento manualmente
7. Verifique se o webhook foi chamado nos logs do Vercel

---

## Como ativar produção

1. Crie conta Asaas de produção em https://www.asaas.com/
2. Gere a chave de API de produção
3. Atualize variáveis de ambiente na Vercel:
   - `ASAAS_API_KEY` → chave de produção
   - `ASAAS_API_BASE_URL` → `https://api.asaas.com/v3`
4. Configure webhook no painel Asaas de produção
5. Teste com um pagamento PIX real de baixo valor

---

## Comportamento sem chave configurada

Se `ASAAS_API_KEY` estiver vazia, a rota `/api/checkout/asaas` retorna erro 500 com mensagem amigável. O checkout form exibe o erro ao usuário.
