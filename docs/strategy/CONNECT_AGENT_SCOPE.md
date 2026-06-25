# Shamar Connect + Shamar Agent — Escopo operacional

Este documento é o resumo curto da decisão de escopo registrada em `docs/decisions/0008-connect-and-agent-product-scope.md`.

## Escopo deste repositório

Neste projeto, o foco é somente:

1. **Shamar Connect**;
2. **Shamar Agent**.

Não puxar outros produtos da visão maior da Shamar Suite para este roadmap, site, proposta ou implementação.

## Shamar Connect

O Shamar Connect é a central de atendimento, relacionamento e vendas.

Foco:

- WhatsApp;
- Instagram;
- Facebook;
- canais conectados;
- atendimento;
- equipes;
- setores;
- responsáveis;
- histórico;
- retorno;
- vendas;
- mídia e áudio;
- transcrição como add-on;
- ligações/gravações como recursos opcionais;
- integração com sistemas existentes.

## Shamar Agent

O Shamar Agent é um aplicativo executável/conector instalado no ambiente do cliente.

Ele integra sistemas internos ao Shamar Connect.

Ele **não é**:

- IA;
- chatbot;
- atendente virtual;
- agente conversacional;
- robô de resposta;
- substituto de ERP.

## O que o Agent faz

Hoje, o Agent começa com leitura de dados autorizados:

- produtos;
- preços;
- estoque;
- clientes;
- veículos/carros em serviço;
- agendamentos;
- status de serviços/reparos;
- dados úteis para o atendimento.

No futuro, pode escrever em sistemas de terceiros ou próprios, mas somente com permissão, auditoria e controle.

## Linha vermelha

O Shamar Connect/Agent não substitui:

- CPlus;
- ERP;
- sistema fiscal;
- estoque completo;
- financeiro interno;
- OS completa;
- gestão interna completa do cliente.

## Caso Lips

Para Lips:

- vender Shamar Connect Professional como central de atendimento;
- Agent entra como conector local para CPlus/sistema atual;
- integração CPlus é projeto separado e sob diagnóstico;
- e-commerce Lips é porta de entrada conectada ao atendimento;
- não vender substituição do CPlus.

## Frase de controle

O Shamar organiza o relacionamento com o cliente. O Agent busca informações no sistema atual. O sistema atual continua cuidando da gestão interna.
