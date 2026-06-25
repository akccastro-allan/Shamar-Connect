# ADR 0008 — Escopo do Shamar Connect e Shamar Agent

## Status

Aprovado.

## Contexto

O ecossistema Shamar pode ter várias soluções, mas este repositório e este ciclo de produto devem focar somente em:

1. **Shamar Connect**;
2. **Shamar Agent**.

Outros produtos da visão maior da Shamar Suite não fazem parte do escopo operacional deste projeto neste momento.

Esta decisão existe para evitar que prompts, implementações futuras, site, planos comerciais ou integrações confundam o Shamar Connect com ERP, sistema fiscal, sistema de estoque, gestão completa de oficina, Shamar Kids, Shamar Events ou outros produtos.

## Decisão

### Shamar Connect

O Shamar Connect é a central de atendimento, relacionamento e vendas.

Ele deve organizar canais como WhatsApp, Instagram, Facebook e canais conectados, com foco em:

- entrada de clientes;
- atendimento;
- equipes;
- setores;
- responsáveis;
- histórico;
- retorno;
- mídia;
- áudio;
- transcrição como add-on;
- ligações quando houver suporte;
- gravação como add-on;
- integração com sistemas existentes;
- e-commerce como porta de entrada conectada ao atendimento.

O Shamar Connect não deve prometer substituir sistemas internos do cliente.

### Shamar Agent

O Shamar Agent é um aplicativo executável/conector instalado no ambiente do cliente para integrar sistemas internos ao Shamar Connect.

Ele não é IA, chatbot, atendente virtual, agente conversacional ou robô de conversa.

A função do Shamar Agent é servir como ponte controlada entre o ambiente do cliente e o Shamar Connect.

O Shamar Agent pode se conectar a:

- sistemas locais;
- CPlus ou sistemas equivalentes;
- ERPs;
- bancos locais, como Firebird;
- APIs internas;
- arquivos;
- e-commerce;
- sistemas próprios da Moriah quando necessário.

## Fases do Shamar Agent

### Fase 1 — Leitura de dados

O foco inicial do Agent é leitura de informações autorizadas.

Exemplos:

- consultar produtos;
- consultar preços;
- consultar estoque;
- consultar dados de clientes;
- consultar veículos/carros em serviço;
- consultar status de reparos;
- consultar agenda;
- consultar serviços agendados;
- consultar dados úteis para o atendimento.

### Fase 2 — Escrita controlada

No futuro, o Agent poderá escrever em sistemas de terceiros ou sistemas próprios, mas somente com controle explícito.

Exemplos futuros:

- agendar serviços;
- registrar pré-orçamentos;
- criar solicitação de reparo;
- criar pré-OS;
- enviar pedido do e-commerce;
- atualizar status de atendimento;
- sincronizar dados autorizados.

Toda escrita deve ter:

- permissão explícita;
- auditoria;
- controle por usuário;
- registro de quem executou;
- sistema de destino;
- payload permitido;
- data e hora;
- status de sucesso ou falha;
- trilha de reversão ou correção quando aplicável.

## Fora do escopo deste projeto

Neste projeto, não prometer, implementar ou posicionar o Shamar Connect/Agent como:

- Shamar ERP;
- Shamar Kids;
- Shamar Events;
- sistema fiscal;
- emissão de nota;
- estoque completo;
- financeiro completo;
- OS completa;
- gestão interna completa do cliente;
- substituto do CPlus;
- substituto de ERP;
- gestão completa de oficina;
- chatbot autônomo;
- IA substituindo equipe;
- agente conversacional.

## Posicionamento para oficinas e autopeças

Para oficinas e autopeças, incluindo o caso Lips:

- o CPlus ou sistema atual continua cuidando da gestão interna;
- o Shamar Connect organiza atendimento, clientes, responsáveis, retorno e relacionamento;
- o Shamar Agent integra o sistema atual ao Shamar Connect;
- o e-commerce é uma porta de entrada conectada ao atendimento;
- não vender o Shamar como substituto do CPlus.

Mensagem recomendada:

> O Shamar Connect não substitui o sistema de gestão da sua oficina ou autopeças. Ele entra como a camada de atendimento, vendas e relacionamento, organizando os clientes que chegam pelo WhatsApp, Instagram, Facebook, balcão ou e-commerce.
>
> Seu sistema atual continua cuidando da operação interna. O Shamar ajuda sua equipe a não perder cliente na entrada, registrar pré-orçamentos, definir responsáveis, acompanhar retornos e manter histórico de atendimento.
>
> Quando fizer sentido, o Shamar Agent pode integrar com o sistema atual para buscar informações úteis, como produtos, preços, estoque, veículos em serviço, agendamentos, serviços e reparos, sem obrigar sua empresa a trocar tudo.

## Caso Lips

Para a Lips, o posicionamento é:

1. **Shamar Connect Professional** como central de atendimento e relacionamento;
2. **Shamar Agent Local** como conector para buscar informações no CPlus/sistema atual;
3. **Integração CPlus** como projeto separado e sob diagnóstico;
4. **E-commerce Lips** como porta de venda/captação conectada ao atendimento.

O Shamar não fará o que o CPlus faz.

O objetivo inicial é:

- organizar a entrada do cliente;
- registrar pré-atendimento;
- apoiar orçamento inicial;
- acompanhar retorno;
- organizar responsáveis;
- consultar dados úteis no sistema atual via Agent;
- facilitar atendimento e vendas.

## Diretrizes comerciais do Agent

O Shamar Agent é vendido separadamente como add-on ou projeto de integração.

Referência comercial inicial:

- **Shamar Agent Local — leitura:** R$ 149/mês por instalação/conector;
- **Shamar Agent com escrita habilitada:** R$ 249/mês por instalação/conector;
- **Diagnóstico técnico:** R$ 497;
- **Implantação de integração:** a partir de R$ 1.500;
- **Integrações customizadas:** sob orçamento.

Esses valores podem ser ajustados comercialmente, mas a lógica deve ser mantida: Agent não é parte básica de todos os planos; Agent é integração técnica vendida separadamente.

## Regras para site e materiais comerciais

Não escrever nem sugerir:

- “substitua seu ERP”;
- “troque seu sistema de gestão”;
- “fazemos o que o CPlus faz”;
- “gestão completa de oficina”;
- “emissão fiscal”;
- “estoque completo”;
- “Agent de IA”;
- “chatbot autônomo”;
- “agente que responde pelo humano”.

Usar:

- “central de atendimento, relacionamento e vendas”;
- “organização da entrada do cliente”;
- “responsáveis, setores, histórico e retorno”;
- “integração com sistemas existentes”;
- “conector local para sistemas internos”;
- “humano no controle”.

## Resumo curto para prompts futuros

> Neste repositório, o foco é somente Shamar Connect e Shamar Agent.
>
> Shamar Connect é central de atendimento, relacionamento e vendas.
>
> Shamar Agent é conector local de integração entre sistemas do cliente e o Shamar Connect.
>
> O Agent começa lendo dados autorizados e futuramente poderá escrever com permissão e auditoria.
>
> O Shamar não substitui CPlus, ERP, fiscal, estoque, financeiro ou gestão interna.
