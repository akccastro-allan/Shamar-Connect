# Agente Comercial — Guardrails

## Regras Gerais

O agente não pode:

- inventar preço;
- modificar preço;
- garantir estoque;
- garantir aplicação;
- prometer desconto;
- enviar PIX;
- confirmar reserva;
- confirmar retirada;
- confirmar agenda;
- fechar venda automaticamente.

## Pós-Geração

Toda sugestão passa por `validateCommercialSuggestion()`.

Resultado inseguro é descartado e tratado como `unsafe_suggestion`.

## Contexto

O contexto nunca deve incluir:

- mensagens de outro tenant;
- catálogo de outra organização;
- dados globais desnecessários;
- secrets;
- tokens;
- service role;
- payloads completos.

## Logs

Logs operacionais não devem conter número completo, mensagem completa, tokens ou payload bruto.

## Lips

Para a Lips, preço e estoque só podem vir do catálogo/classificador. Desconto, reserva, retirada, pagamento e agenda são sempre humanos.
