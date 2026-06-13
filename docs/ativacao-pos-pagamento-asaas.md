# Ativação pós-pagamento Asaas

Este documento define o fluxo correto para transformar uma contratação paga em conta ativa no ShamarConnect.

## Objetivo

Quando o cliente pagar pelo checkout Asaas, o ShamarConnect deve registrar o pagamento, criar ou vincular a assinatura e liberar o acesso conforme o plano contratado.

## Fluxo esperado

1. Cliente acessa `/planos`.
2. Cliente escolhe plano.
3. Cliente vai para `/checkout?plan=starter|professional|business`.
4. O checkout chama `POST /api/checkout/asaas`.
5. O sistema cria uma linha em `billing_checkout_sessions`.
6. O sistema cria cliente e cobrança no Asaas.
7. O cliente paga pelo link do Asaas.
8. O Asaas chama `POST /api/webhooks/asaas`.
9. O webhook localiza o checkout pelo `externalReference`.
10. O webhook marca o checkout como pago.
11. O sistema chama a função `activate_paid_checkout_subscription`.
12. O banco cria ou atualiza a assinatura em `billing_subscriptions`.
13. O financeiro registra fatura e pagamento.
14. A empresa/tenant fica ativo quando houver vínculo seguro.

## Função criada no banco

Função:

```txt
activate_paid_checkout_subscription
```

Responsabilidade:

- transformar checkout pago em assinatura;
- registrar vínculo com tenant/organization quando já existente;
- registrar valores de plano, implantação, WhatsApps extras, usuários extras e módulo IA;
- evitar duplicidade de assinatura para o mesmo checkout;
- manter dados suficientes para conciliação com Asaas.

## Regra de segurança

A ativação automática completa só deve ocorrer quando o checkout tiver vínculo seguro com `tenant_id` e `organization_id`.

Se o checkout foi pago, mas ainda não existe vínculo com empresa/tenant, o sistema deve manter o status como pago aguardando ativação administrativa.

Isso evita criar ou liberar empresas automaticamente para dados incorretos, fraude, pagamento de terceiros ou erro de cadastro.

## Ponto pendente no código

O webhook `app/api/webhooks/asaas/route.ts` precisa chamar a função `activate_paid_checkout_subscription` quando o evento do Asaas indicar pagamento confirmado.

Eventos que devem acionar a ativação:

```txt
PAYMENT_RECEIVED
PAYMENT_CONFIRMED
```

Eventos que devem marcar como pendente/cancelado/reembolsado:

```txt
PAYMENT_OVERDUE
PAYMENT_DELETED
PAYMENT_REFUNDED
PAYMENT_REFUND_IN_PROGRESS
```

## Variáveis necessárias

Na Vercel:

```txt
ASAAS_API_KEY
ASAAS_API_BASE_URL
ASAAS_WEBHOOK_TOKEN
APP_PUBLIC_URL
```

Ambiente sandbox:

```txt
ASAAS_API_BASE_URL=https://api-sandbox.asaas.com/v3
```

## Pendência operacional

Antes de vender oficialmente:

- configurar variáveis na Vercel;
- criar webhook no painel do Asaas apontando para `/api/webhooks/asaas`;
- validar token do webhook;
- fazer pagamento sandbox;
- confirmar registro em `billing_checkout_sessions`;
- confirmar registro em `billing_subscriptions`;
- confirmar `finance_payments` e `finance_invoices`;
- testar fluxo de cancelamento e reembolso.
