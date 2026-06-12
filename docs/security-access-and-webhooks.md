# Segurança de acesso e webhooks

## Login com Google

O Google OAuth serve apenas para identificar o e-mail do usuário.

O acesso ao painel interno do ShamarConnect só é liberado quando o e-mail autenticado existe na base interna e possui vínculo ativo com uma empresa/tenant.

Fluxo esperado:

1. Usuário autentica com Google.
2. O callback lê o e-mail autenticado.
3. O sistema procura o e-mail em `app_users`.
4. O sistema confirma vínculo ativo em `tenant_users`.
5. Se autorizado, cria a sessão interna `shamar_connect_session`.
6. Se não autorizado, redireciona para `/planos?reason=not-authorized`.

## Rotas privadas

As rotas internas exigem a sessão interna do ShamarConnect. Cookie do provedor OAuth sozinho não libera acesso.

Rotas protegidas incluem:

- `/dashboard`
- `/inbox`
- `/whatsapp-messages`
- `/crm`
- `/pipeline`
- `/contacts`
- `/settings`
- `/quick-replies`
- `/conversation-flows`
- `/automations`
- `/knowledge`
- `/audit`

## Gateway WhatsApp

A rota oficial para o gateway enviar eventos é:

`POST /api/whatsapp/events`

O gateway precisa enviar uma chave interna no header `x-whatsapp-gateway-key`.

O valor desse header deve ser igual ao valor configurado no ambiente de produção do ShamarConnect.

Nunca enviar eventos do gateway sem autenticação.

## Processamento interno de eventos

A rota interna para processar eventos pendentes é:

`POST /api/internal/whatsapp/process-events`

Essa rota exige o header `x-internal-api-key`.

Ela chama a função do banco `process_pending_whatsapp_provider_events`, que transforma eventos pendentes em conversas e mensagens.

## Regras obrigatórias

- Nunca liberar painel apenas por OAuth.
- Nunca criar empresa automaticamente para e-mail não autorizado.
- Nunca apagar mensagem original quando houver evento de mensagem deletada.
- Todo evento recebido do gateway deve ser salvo em `provider_events` antes de qualquer processamento.
- Erros de processamento devem ficar registrados no banco.
