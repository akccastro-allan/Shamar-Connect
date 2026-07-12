# Social Channels Roadmap

Data: 2026-07-12

Escopo: redes sociais internas no Centro de Comando. Não liberar para clientes comerciais nesta fase.

## Regra

Redes sociais entram primeiro como `internal_alpha`, atrás de `social_channels_internal`.

Não implementar respostas automáticas nesta etapa.

Não criar integração falsa: uma conta só deve aparecer como conectada quando houver conexão real validada.

## Modelo Seguro

Campos não secretos para a interface interna:

- `provider`;
- `account_label`;
- `external_account_id`;
- `page_id`;
- `business_id`;
- `status`;
- `token_status`;
- `token_expires_at`;
- `last_event_at`;
- `last_error`.

Tokens, refresh tokens, client secrets e API keys não entram em objetos retornados ao frontend.

Estados exibidos:

- Não conectado;
- Conectado;
- Token expirado;
- Erro de conexão.

## Instagram

Objetivo inicial:

- conectar conta;
- associar página/perfil;
- receber eventos suportados;
- diferenciar direct message, comentário, menção e story reply;
- preservar histórico;
- responder manualmente quando a API permitir;
- mostrar erro de token e expiração.

Não tratar comentário público como mensagem privada.

## Facebook

Objetivo inicial:

- páginas comerciais;
- Messenger;
- comentários;
- menções;
- identidade externa;
- resposta manual permitida;
- expiração/revogação de token;
- permissões.

Não usar conta pessoal para automação comercial.

## TikTok

Primeiro marco é mapear capacidades reais da API disponível.

Se mensagens privadas não forem suportadas:

- não mostrar inbox falsa;
- mostrar somente eventos realmente suportados;
- registrar limitação no Admin interno;
- manter resposta manual desativada onde a API não permitir.

## Normalização

Eventos devem preservar `channel_id` e payload original seguro, mas também gerar uma visão normalizada:

```text
message
comment
mention
story_reply
group_message
community_message
status
```

Não forçar todas as redes a conceitos exclusivos do WhatsApp.

## Identidade

Identidades suportadas:

- phone;
- whatsapp_id;
- whatsapp_lid;
- instagram_user_id;
- facebook_psid;
- tiktok_user_id;
- email.

Não mesclar contatos automaticamente apenas por nome.

## Ordem Recomendada

```text
1. Instagram
2. Facebook
3. TikTok
```

Não avançar para a próxima rede antes de pelo menos um fluxo real funcional na anterior.
