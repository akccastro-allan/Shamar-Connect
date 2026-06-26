# ADR 0003 — Roteamento obrigatório por canal

## Status

Aprovado.

## Contexto

O Shamar Connect atenderá clientes com múltiplos números e múltiplos providers:

- Evolution API / WhatsApp Web;
- Meta WhatsApp Cloud API;
- Instagram Direct;
- Facebook Messenger.

O sistema não pode enviar uma resposta pelo número ou marca errada.

## Decisão

Toda conversa e toda mensagem devem estar vinculadas a um `channel_id`.

Toda mensagem de saída deve ser enviada pelo provider e credenciais associados ao `channel_id` da conversa.

## Proibições

- usar instância padrão;
- usar número padrão;
- usar `EVOLUTION_INSTANCE` global para decidir destino;
- usar `EVOLUTION_TENANT_ID` ou `EVOLUTION_ORGANIZATION_ID` como verdade de webhook;
- buscar “primeiro canal da organização”;
- rotear saída por `conversation.provider` sem validar `channel_id`;
- aceitar envio sem canal explícito.

## Resolução de canal

### Evolution

```text
payload.instance -> channels.external_instance_id ou provider_config.instance_name
```

### Meta WhatsApp

```text
phone_number_id -> channels.provider_external_id
```

### Instagram

```text
instagram account id -> channels.provider_external_id
```

### Messenger

```text
page id -> channels.provider_external_id
```

## Fluxo de entrada

```text
Webhook recebido
  -> validar assinatura/chave
  -> resolver canal
  -> persistir evento bruto idempotente
  -> responder ao provider
  -> processar evento
  -> criar/atualizar identidade
  -> criar/atualizar contato
  -> criar/atualizar conversa
  -> criar mensagem
```

## Fluxo de saída

```text
Usuário envia mensagem
  -> validar acesso à conversa
  -> obter channel_id da conversa
  -> obter conexão ativa do canal
  -> criar item de outbox
  -> enviar pelo adapter correto
  -> atualizar status
  -> auditar
```

## Consequências

- Permite migrar um número de Web para API oficial sem perder histórico.
- Permite ter clientes híbridos.
- Evita mistura de empresas.
- Aumenta necessidade de migrations e validações de integridade.

## Testes obrigatórios

1. Dois canais Evolution simultâneos.
2. Um canal Evolution e um Meta simultâneos.
3. Instagram e Messenger respondendo pela conta correta.
4. Envio sem `channel_id` falha.
5. Webhook duplicado não duplica mensagem.
6. Usuário de uma empresa não envia por canal de outra.
