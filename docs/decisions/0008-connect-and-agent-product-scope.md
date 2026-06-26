# 0008 — Escopo oficial do Shamar Connect e Shamar Agent

## Status

Aceito.

## Contexto

O Shamar Suite possui várias possibilidades de produto, mas este repositório deve permanecer focado no Shamar Connect e no Shamar Agent.

Sem esta decisão documentada, prompts futuros, páginas comerciais e propostas podem misturar atendimento, ERP, fiscal, estoque completo, financeiro interno, chatbot e automação conversacional.

## Decisão

Este repositório foca somente em:

- Shamar Connect
- Shamar Agent

## Shamar Connect

O Shamar Connect é uma central de atendimento, relacionamento e vendas.

Ele organiza:

- WhatsApp e canais conectados
- conversas
- contatos
- histórico
- responsáveis
- setores e filas
- respostas rápidas
- notas internas
- assinatura de atendente
- funil comercial
- retorno e pós-venda
- métricas básicas

## Shamar Agent

O Shamar Agent é um aplicativo/conector local instalado no ambiente do cliente.

Ele serve para integrar sistemas internos ao Shamar Connect e buscar dados autorizados que apoiem o atendimento.

Exemplos:

- produtos
- preços
- estoque consultivo
- pedidos
- clientes
- agenda
- serviços
- status interno

## O que o Agent não é

O Agent não é:

- IA
- chatbot
- atendente virtual
- robô de conversa
- substituto de funcionário
- substituto de ERP
- sistema fiscal
- sistema financeiro
- estoque completo

## Evolução permitida

No início, o Agent deve priorizar leitura de dados autorizados.

No futuro, poderá executar escrita controlada, desde que exista:

- permissão explícita
- auditoria
- registro da ação
- rastreabilidade
- controle humano

## Limites comerciais

O Shamar Connect organiza o relacionamento com o cliente.

O Shamar Agent busca informações no sistema atual.

O sistema atual continua cuidando da gestão interna.

## Fora do escopo deste repositório

Não faz parte deste repositório:

- Shamar ERP completo
- Shamar Kids
- Shamar Events
- fiscal
- financeiro interno completo
- estoque completo
- contabilidade
- folha
- prontuário médico
- OS completa

## Frase de referência

> O Shamar organiza o relacionamento com o cliente. O Agent busca informações no sistema atual. O sistema atual continua cuidando da gestão interna.
