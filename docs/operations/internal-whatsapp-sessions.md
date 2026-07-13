# Internal WhatsApp Sessions

Data: 2026-07-12

Escopo: múltiplas sessões WhatsApp internas no Centro de Comando Allan/Moriah.

## Regra Central

Cada número real precisa de um canal próprio em `channels`. A identificação operacional completa é `gateway_id + session_id`.

O mesmo `session_id` pode existir em gateways diferentes. No mesmo gateway, não pode duplicar.

Não usar `lips-main` em canais internos.

Não alterar a Lips para cadastrar canais internos.

## Nomenclatura

Usar o padrão obrigatório `<empresa>-01` até `<empresa>-09`:

- `moriah-01`
- `viciados-01`
- `mkshalom-01`
- `allan-01`
- `shamar-kids-01`
- `shamar-kids-09`
- `oriahfin-01`

Não usar `*-main`, `*-00`, `*-10`, letras maiúsculas ou `_` em novas sessões internas. A sessão real só deve ser criada com autorização do Allan e QR code do número correto.

Regex aplicada pelo helper central `lib/providers/session-id.ts`:

```regex
^[a-z0-9]+(?:-[a-z0-9]+)*-0[1-9]$
```

Operadores não digitam `session_id` livremente em `/operations/channels`; a próxima sessão é gerada por empresa e gateway.

## Gateways

Modelo persistido em `internal_messaging_gateways`:

- `id`;
- `name`;
- `slug`;
- `base_url`;
- `environment`;
- `status`;
- `version`;
- `max_sessions`;
- `active_sessions`;
- `last_health_check`;
- `last_error`.

Credenciais e API keys não entram no frontend e não devem ser salvas em metadata pública.

`channels.gateway_id` é a referência principal. `metadata.gatewayId` é apenas fallback de transição.

## Limite

Cada empresa pode usar `01` até `09` por gateway. Se o gateway já tiver as nove sessões daquela empresa, a tela bloqueia com:

```text
Este gateway atingiu o limite de nove sessões para esta empresa. Selecione outro gateway.
```

## Shamar Kids

Criar canais separados:

- Pais e responsáveis: finalidade `parents`.
- Atendimento e suporte: finalidade `support`.

Não misturar conversas entre os dois números.

## Primeiros Cadastros Previstos

- OriahFin: `oriahfin-01`, finalidade `notifications`.
- Viciados em Trilhas: `viciados-01`, finalidade `sales`.
- MK Shalom: `mkshalom-01`, finalidade `support`.
- Moriah Systems: `moriah-01`, finalidade `operations`.
- Allan / Pessoal: `allan-01`, finalidade `personal`.
- Shamar Kids: `shamar-kids-01`, finalidade `parents`.
- Shamar Kids: `shamar-kids-02`, finalidade `support`.

Não usar números reais no cadastro preparatório. Não gerar QR. Não criar sessões no gateway nesta etapa.

## Conexão

Fluxo seguro:

1. cadastrar canal interno em `/operations/channels`;
2. confirmar empresa, gateway, finalidade e `session_id` gerado;
3. iniciar sessão no gateway autorizado;
4. solicitar QR pela rota protegida do canal;
5. escanear QR com o número correto;
6. confirmar status conectado pela rota protegida do canal;
7. enviar mensagem externa de teste;
8. confirmar inbound no canal correto;
9. responder manualmente pela inbox;
10. confirmar outbound pela mesma sessão.

Nunca responder uma conversa escolhendo sessão manualmente. A resposta deve usar sempre o `channel_id` da conversa.

## Grupos

Grupos são permitidos somente no Centro de Comando com `whatsapp_groups_internal`.

Para clientes e Lips comercial, grupos seguem bloqueados para automação e envio comercial.

## Comunidades

Comunidades usam `whatsapp_communities_internal`.

Antes de envio, mapear suporte real do provider:

- comunidade;
- grupo de avisos;
- grupos vinculados;
- administradores;
- participantes;
- permissões;
- histórico.

Se o provider não suportar comunidades adequadamente, manter envio desativado e documentar como `internal_alpha`.

## Falhas Comuns

- sessão errada para a empresa;
- canal cadastrado sem `session_id`;
- resposta usando sessão diferente da conversa;
- grupo tratado como conversa individual;
- QR escaneado com número não autorizado;
- canal interno misturado com cliente SaaS.
