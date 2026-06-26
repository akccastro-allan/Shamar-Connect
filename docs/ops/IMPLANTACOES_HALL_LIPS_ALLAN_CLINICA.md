# Shamar Connect — Plano de implantação dos 4 ambientes

## Ordem

1. Hall Donuts;
2. Lips;
3. Allan/Moriah;
4. Clínica.

## Hall Donuts

### Objetivo

Gerar primeiro caixa com implantação simples.

### Configuração

```text
provider: Evolution
canal: WhatsApp principal
setores: Pedidos, Geral
automação: off ou saudação simples
```

### Entregas

- conexão do número;
- recebimento;
- envio;
- mídia;
- histórico;
- respostas rápidas;
- status de conexão;
- treinamento.

### Critério para cobrar

- mensagem entra e sai pelo mesmo número;
- histórico preservado;
- duplicidade controlada;
- desconexão visível;
- equipe sabe operar.

## Lips

### Objetivo

Validar múltiplos atendentes e setores.

### Configuração

```text
provider: Evolution
setores:
  - Autopeças
  - Oficina
  - Agendamento
  - Financeiro
  - Pós-venda
```

### Entregas

- equipe com múltiplos setores;
- assumir conversa;
- transferência;
- notas internas;
- aguardando cliente;
- supervisor;
- auditoria;
- filtros por fila.

### Observação comercial

A CERA pode ser benchmark de gestão automotiva, mas o Shamar deve se posicionar como central de atendimento, relacionamento e conversão omnichannel.

Não prometer ERP automotivo completo na primeira entrega.

## Allan/Moriah

### Objetivo

Validar portfólio multiempresa.

### Empresas/marcas

- Shamar Connect;
- Shamar Kids;
- Shamar Events;
- Shamar ERP;
- Viciados em Trilhas;
- MK Shalom;
- Oriahfin;
- WhatsApp pessoal.

### Regras

- workspace pessoal separado;
- nenhum membro de equipe acessa pessoal;
- automação desligada no pessoal;
- campanhas desligadas no pessoal;
- “Respondendo como” em destaque;
- canais conectados progressivamente.

## Clínica

### Objetivo

Demonstração madura e venda maior.

### Estratégia

1. Fazer imersão presencial.
2. Mapear fluxo real.
3. Entender sistema atual de WhatsApp Web.
4. Testar API oficial em ambiente seguro.
5. Apresentar com dados fictícios.
6. Implantar com menor risco.

### Setores

```text
Agendamento
Autorizações / Convênios
Financeiro
Exames / Documentos
Recepção Geral
```

### Promessa

> O paciente nunca fica preso no robô.

### Regra de automação

- human-first;
- uma tentativa de esclarecer;
- pediu humano, transfere;
- não entendeu, transfere;
- não finaliza automaticamente;
- não dá orientação clínica.

## Checklist comum de implantação

- canal cadastrado;
- credenciais seguras;
- webhook validado;
- envio pelo canal correto;
- teste de idempotência;
- teste de isolamento;
- usuários e papéis;
- setores;
- respostas rápidas;
- treinamento;
- plano de rollback;
- aceite do cliente.
