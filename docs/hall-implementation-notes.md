# Hall - Preparação WhatsApp

## Posicionamento

Hall - Panificação, confeitaria e encomendas.

## Escopo desta sprint

- Perfil de automação criado em `lib/agents/hall-automation-profile.ts`.
- Automação desativada por padrão.
- Número real não deve ser ativado sem autorização.

## Menu

```text
Olá! Sou a atendente virtual da Hall. Como posso ajudar?

1. Ver produtos e valores
2. Fazer uma encomenda
3. Consultar retirada ou entrega
4. Falar com atendimento
```

## Pode responder automaticamente

- Produto cadastrado.
- Preço cadastrado.
- Até 3 opções.
- Data da última atualização do catálogo.
- Pedido de quantidade.
- Pedido de data desejada.
- Pedido de retirada ou entrega.

## Deve ir para humano

- Confirmar encomenda.
- Confirmar data.
- Reservar produto.
- Confirmar entrega.
- Calcular taxa sem regra cadastrada.
- Cobrar ou enviar PIX.
- Fechar pagamento.
