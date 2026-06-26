# Implantação assistida — Shamar Connect

Este fluxo transforma um checkout pago em um cliente ativo, com validação humana antes da liberação.

## Estado de entrada

O cliente entra na fila administrativa quando:

- `billing_checkout_sessions.status = paid_pending_activation`
- `paid_at` está preenchido
- o pagamento foi confirmado pelo webhook Asaas

## Tela administrativa

Rota:

```txt
/admin/implantacao
```

Mostra os checkouts pagos aguardando implantação, com:

- cliente
- e-mail
- plano
- método de pagamento
- valor
- add-ons contratados

## Detalhe da implantação

Rota:

```txt
/admin/implantacao/[id]
```

Antes de provisionar, o admin deve conferir:

- nome do cliente
- e-mail financeiro
- documento
- plano
- ciclo
- forma de pagamento
- valor pago
- add-ons

## Ação de provisionamento

Endpoint:

```txt
POST /api/admin/implantacao/[id]/provision
```

A ação cria:

- tenant
- organização
- usuário owner no Supabase Auth
- registro em `app_users`
- vínculo em `tenant_users`
- canais opcionais, quando enviados

Depois atualiza o checkout para:

```txt
billing_checkout_sessions.status = active
```

## Segurança

As APIs de implantação exigem:

- sessão autenticada
- `role = owner` ou `role = admin`
- `context.isPlatformTenant = true`

Admins de tenants de clientes não devem acessar a fila global de implantação.

## Limite do PR atual

Este PR faz ativação básica.

Ainda não aplica automaticamente permissões completas de plano e add-ons na organização. Entitlements de storage, transcrição, gravação, Agent e limites de usuários/canais devem entrar em PR posterior.

## Pendências futuras

- fortalecer idempotência contra falha parcial
- aplicar entitlements de plano e add-ons
- registrar histórico/auditoria de implantação
- criar fluxo de envio seguro da senha temporária
- permitir reset de senha sem reexibir senha antiga
