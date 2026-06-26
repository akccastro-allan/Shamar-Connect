# ADR 0004 — Automação human-first

## Status

Aprovado.

## Contexto

A clínica relatou que o robô anterior mantinha o paciente preso quando não entendia a mensagem. Isso gerou demora, perda de mensagens e reclamações.

O Shamar Connect não deve começar pela promessa de IA autônoma. O valor inicial é organizar atendimento humano, filas, setores e supervisão.

## Decisão

A automação do Shamar Connect será human-first.

A automação pode:

- saudar;
- identificar intenção simples;
- sugerir setor;
- coletar dados administrativos mínimos;
- sugerir resposta ao atendente;
- registrar motivo interno quando autorizado.

A automação não pode:

- impedir acesso ao humano;
- insistir indefinidamente;
- encerrar atendimento automaticamente;
- dar orientação médica;
- responder conteúdo sensível autonomamente;
- distribuir ignorando competência de atendente.

## Modos

```text
off
assist
triage
autonomous_restricted
```

Para clínica, iniciar em `assist` ou `triage`.

## Regras da clínica

1. Menu inicial com no máximo quatro opções.
2. Sempre oferecer “Falar com atendente”.
3. Aceitar texto livre.
4. Se não entender, perguntar uma única vez.
5. Se não entender novamente, encaminhar ao humano.
6. Palavras de escape transferem imediatamente.
7. Automação nunca encerra conversa.
8. Automação nunca dá orientação clínica.
9. Supervisor pode intervir a qualquer momento.
10. Toda ação automática é auditada.

## Setores iniciais para demonstração

```text
Agendamento
Autorizações / Convênios
Financeiro
Exames / Documentos
Recepção Geral
```

## Critério de sucesso

A frase de venda para clínica é:

> O paciente nunca fica preso no robô.
