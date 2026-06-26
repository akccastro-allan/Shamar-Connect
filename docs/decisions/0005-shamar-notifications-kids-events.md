# ADR 0005 — Shamar Notifications para Kids e Events

## Status

Aprovado.

## Contexto

Antes de vender atendimento complexo, a suíte precisa validar a Meta Cloud API em casos simples, úteis e de baixo risco.

Shamar Kids e Shamar Events são os melhores pilotos para notificações oficiais por template.

## Decisão

Criar o núcleo **Shamar Notifications** para mensagens curtas, informativas, operacionais e rastreáveis.

Produtos iniciais:

- Shamar Kids;
- Shamar Events.

## Escopo do núcleo

```text
template
canal
destinatário
contexto
variáveis
envio imediato
envio agendado
status
auditoria
```

## Shamar Kids

Finalidade:

- chamar responsável;
- chamar líder;
- chamar voluntário;
- avisar coordenação;
- avisar datashow/projeção.

Regra central:

> A mensagem externa não informa o motivo.

Exemplo para responsável:

```text
Olá! Responsável por {{1}}, favor comparecer ao {{2}}.

Equipe {{3}}.
```

Exemplo para líder:

```text
Olá, {{1}}. A equipe {{2}} solicita sua presença no {{3}}, por favor.
```

## Shamar Events

Finalidade:

- lembrar conferência;
- confirmar inscrição;
- avisar data;
- avisar horário;
- avisar local.

Exemplo:

```text
Olá! Lembrando que {{1}} será no dia {{2}}, às {{3}}, em {{4}}.
```

Exemplo:

```text
Olá! Sua inscrição para {{1}} está confirmada. Esperamos você no dia {{2}}, às {{3}}.
```

## Regras de privacidade

1. Mensagem externa é neutra.
2. Motivo é opcional e fica somente como nota interna restrita.
3. Não enviar dado sensível em template.
4. Não enviar foto de criança no MVP.
5. Não conversar diretamente com criança.
6. Responsável precisa estar autorizado.
7. Toda chamada gera auditoria.

## API oficial

Este núcleo será o primeiro laboratório real da Meta Cloud API.

Testar:

- criação/aprovação de templates;
- variáveis;
- envio;
- status entregue/lido/falhou;
- webhook;
- logs;
- custo real;
- erro de template;
- canal correto.

## Fora de escopo inicial

- chatbot;
- conversa livre;
- campanha em massa;
- disparo promocional;
- dados médicos;
- fotos;
- integração com check-in avançado.
