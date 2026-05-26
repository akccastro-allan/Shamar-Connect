# Pesquisa de funcionalidades: CRM + WhatsApp

Data: 2026-05-26

## Objetivo

Mapear funcionalidades de soluções de mercado para orientar o ShamarConnect em três frentes:

1. ambiente de teste com mock provider;
2. integração progressiva com CRM próprio;
3. preparação para API oficial do WhatsApp Business Platform.

## Soluções analisadas

- Umbler Talk
- Suri AI
- ChatPro
- Helena CRM
- RD Station
- Nuvemshop
- Zendesk
- Kyte
- Jumpseller
- Bolten
- Blip
- Cielo
- Getnet
- Daniela Atacado

## Padrões encontrados

### 1. Inbox multiatendente

Funcionalidades recorrentes:

- múltiplos atendentes no mesmo número;
- filas e responsáveis;
- status da conversa;
- histórico único por contato;
- transferência entre atendentes;
- notas internas;
- SLA e tempo médio de resposta.

Decisão ShamarConnect:

- P0: inbox com status `open`, `pending`, `resolved`;
- P0: responsável por conversa;
- P1: filas e departamentos;
- P1: SLA e relatórios operacionais.

### 2. CRM integrado ao WhatsApp

Funcionalidades recorrentes:

- contato criado automaticamente pelo telefone;
- tags e segmentação;
- etapas de funil;
- oportunidades com valor;
- próxima ação;
- histórico de mensagens no registro do lead.

Decisão ShamarConnect:

- P0: normalizar contato por telefone;
- P0: criar oportunidade a partir de conversa quente;
- P0: lead score simples;
- P1: automações de etapa;
- P2: múltiplos funis por tenant.

### 3. IA e automação

Funcionalidades recorrentes:

- chatbot;
- IA generativa;
- respostas rápidas;
- classificação de intenção;
- recuperação de carrinho;
- follow-up automatizado;
- atendimento híbrido humano + IA.

Decisão ShamarConnect:

- P0: copiloto, não envio automático;
- P0: classificador de intenção determinístico para teste;
- P1: OpenAI com guardrails;
- P1: regras de follow-up com consentimento;
- P2: agente automatizado por departamento.

### 4. Comércio pelo WhatsApp

Funcionalidades recorrentes:

- catálogo;
- pedido;
- checkout;
- link de pagamento;
- status do pedido;
- integrações com loja virtual.

Decisão ShamarConnect:

- P1: pedido simples ligado ao contato;
- P1: link de pagamento manual;
- P2: catálogo externo;
- P2: integrações com e-commerce.

### 5. API oficial e governança

Premissas para integração oficial:

- mensagens recebidas entram por webhook;
- mensagens ativas exigem templates aprovados;
- janela de atendimento deve ser respeitada;
- status de entrega/leitura deve ser persistido;
- credenciais devem ser separadas por tenant/empresa;
- marketing exige consentimento e opt-out.

## Backlog técnico imediato

1. Criar modelos CRM: contato, oportunidade, evento de conversa e lead score.
2. Criar feature lab para testar score e intenção sem API oficial.
3. Criar webhook interno normalizado para receber eventos de providers.
4. Criar provider Meta Cloud API atrás de interface comum.
5. Criar tabela de templates e status de aprovação.
6. Criar playbooks: venda, suporte, cobrança, pós-venda e recuperação.
7. Criar trilha de auditoria para envios e automações.

## Critério de produto

O ShamarConnect deve ser vendido como CRM operacional de WhatsApp com IA assistiva, não apenas como chatbot. O diferencial inicial deve ser: atendimento humano organizado, CRM simples, lead score, follow-up e preparação para API oficial.
