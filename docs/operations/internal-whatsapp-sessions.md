# Internal WhatsApp Sessions

Data: 2026-07-11

Escopo: múltiplas sessões WhatsApp internas no Centro de Comando Allan/Moriah.

## Regra Central

Cada número real precisa de um canal próprio em `channels` e um `session_id` único.

Não usar `lips-main` em canais internos.

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

## Shamar Kids

Criar canais separados:

- Pais e responsáveis: finalidade `parents`.
- Atendimento e suporte: finalidade `support`.

Não misturar conversas entre os dois números.

## Conexão

Fluxo seguro:

1. cadastrar canal interno em `/operations/channels`;
2. confirmar empresa, finalidade e `session_id`;
3. iniciar sessão no gateway autorizado;
4. escanear QR com o número correto;
5. confirmar status conectado;
6. enviar mensagem externa de teste;
7. confirmar inbound no canal correto;
8. responder manualmente pela inbox;
9. confirmar outbound pela mesma sessão.

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
