# Checklist de validação — implantação assistida

Use este checklist antes de considerar o painel de implantação pronto para produção.

## Pré-condição

- [ ] Existe pelo menos um checkout com `status = paid_pending_activation`
- [ ] O checkout possui `paid_at` preenchido
- [ ] O checkout possui `customer_email`
- [ ] O checkout possui `plan_slug`
- [ ] O checkout possui `payment_method`

## Acesso

- [ ] Usuário owner/admin da plataforma acessa `/admin/implantacao`
- [ ] Usuário comum não acessa `/admin/implantacao`
- [ ] Owner/admin de tenant cliente não acessa as APIs administrativas
- [ ] API `GET /api/admin/implantacao` retorna 403 fora da plataforma
- [ ] API `GET /api/admin/implantacao/[id]` retorna 403 fora da plataforma
- [ ] API `POST /api/admin/implantacao/[id]/provision` retorna 403 fora da plataforma

## Lista

- [ ] Cliente pendente aparece na lista
- [ ] Plano aparece corretamente
- [ ] Método de pagamento aparece corretamente
- [ ] Valor aparece corretamente
- [ ] Add-ons aparecem quando existem
- [ ] Botão Implantar abre `/admin/implantacao/[id]`

## Detalhe

- [ ] Tela mostra nome do cliente
- [ ] Tela mostra e-mail
- [ ] Tela mostra documento
- [ ] Tela mostra plano
- [ ] Tela mostra ciclo
- [ ] Tela mostra forma de pagamento
- [ ] Tela mostra valor pago
- [ ] Tela mostra data de pagamento
- [ ] Tela mostra add-ons quando existem

## Provisionamento

- [ ] Clicar em Provisionar e ativar cria tenant
- [ ] Cria organização
- [ ] Cria usuário no Supabase Auth
- [ ] Cria linha em `app_users`
- [ ] Cria vínculo em `tenant_users`
- [ ] Atualiza `billing_checkout_sessions.tenant_id`
- [ ] Atualiza `billing_checkout_sessions.organization_id`
- [ ] Atualiza `billing_checkout_sessions.status = active`
- [ ] Cliente some da lista de pendentes

## Pós-provisionamento

- [ ] Tela mostra tenantId
- [ ] Tela mostra organizationId
- [ ] Tela mostra authUserId
- [ ] Tela mostra e-mail
- [ ] Tela mostra senha temporária
- [ ] Botão Copiar senha temporária copia o valor

## Observação

O fluxo atual ainda não aplica entitlements completos de plano e add-ons.
