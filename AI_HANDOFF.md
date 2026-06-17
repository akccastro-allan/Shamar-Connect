# AI Handoff — ShamarConnect / Shamar Suite

Arquivo para outro prompt/agente assumir o trabalho sem perder contexto.

## Como trabalhar com Allan

- Responder em PT-BR.
- Ser objetivo, prático e operacional.
- Allan prefere decisões, ordem de tarefas e execução, não explicações longas de código.
- Pode executar mudanças seguras em GitHub e Supabase.
- Não apagar dados nem fazer mudanças destrutivas sem confirmação explícita.
- Não gravar credenciais, chaves, tokens, senhas ou segredos no repositório.

## Empresa e suíte

A empresa é a Moriah Systems.

A suíte é a Shamar Suite.

Módulos planejados:

- ShamarConnect: foco atual; atendimento, WhatsApp, Kanban, histórico, respostas rápidas e futuramente Telegram/redes sociais.
- Shamar-Agent: conector local/API para sistemas dos clientes.
- ShamarERP: controle interno da Moriah Systems; clientes, contratos, cobranças, implantação, suporte e operação financeira. Não é prioridade agora.
- ShamarEvents: eventos.
- ShamarKids: kids/escolas/ministérios infantis.
- ShamarChurch: igrejas.
- Aziel Bible: Bíblia/estudo.

Prioridade atual:

```txt
Foco total nesta e na próxima semana: ShamarConnect.
ERP será trabalhado depois, em paralelo, sem urgência.
```

## Repositórios

```txt
ShamarConnect: akccastro-allan/Shamar-Connect
Branch: main
Visibilidade atual: public

Shamar-Agent: akccastro-allan/Shamar-Agent
Branch: main
Visibilidade atual: private
```

## Supabase

Projeto principal:

```txt
Shamar-Connect
ref: bbcxqvgdsdntwojjpwoz
```

Regras:

- Usar migration para estrutura de banco.
- Usar consulta SQL apenas para validação/leitura.
- Não fazer alteração destrutiva sem Allan confirmar.
- O Shamar-Agent nunca acessa o banco central diretamente.
- O Shamar-Agent fala apenas com APIs seguras do ShamarConnect.

## Produto atual — ShamarConnect

Foco:

- atendimento via WhatsApp;
- histórico persistente;
- preservação de mensagens apagadas;
- Kanban comercial;
- respostas rápidas;
- assinatura de atendente;
- notas internas;
- métricas básicas;
- checkout e ativação;
- Hall e Lips como primeiros clientes/pilotos;
- cliente grande em 15 dias.

Não priorizar agora:

- disparo em massa;
- IA avançada;
- chatbot completo;
- ERP completo;
- fiscal;
- estoque completo;
- integração bidirecional.

## Clientes prioritários

### Hall

Objetivo: colocar Hall em operação com ShamarConnect puro.

Escopo fase 1:

- WhatsApp conectado;
- conversas organizadas;
- Kanban comercial;
- respostas rápidas;
- assinatura dos atendentes;
- notas internas;
- métricas básicas;
- treinamento inicial.

Dados a coletar:

- nome oficial;
- CNPJ, se tiver;
- e-mail financeiro;
- e-mail administrativo;
- WhatsApp principal;
- quantidade de atendentes;
- nomes/e-mails dos usuários;
- etapas do atendimento;
- produtos/serviços;
- respostas repetidas.

Sugestão comercial:

```txt
Professional: R$ 297/mês + implantação R$ 497
ou Business: R$ 597/mês + implantação R$ 997, se houver volume/equipe maior.
```

### Auto Center / Auto Peças Lips

Objetivo: piloto técnico com ShamarConnect + Shamar-Agent.

Escopo fase 1:

- ShamarConnect configurado;
- WhatsApp configurado;
- Shamar-Agent preparado;
- checklist técnico preenchido;
- CPlus/Firebird em leitura;
- primeira leitura ou conexão validada.

Conector inicial:

```txt
cplus_firebird
```

Não fazer na fase 1:

- escrever no banco do CPlus;
- fiscal;
- estoque completo;
- financeiro completo;
- integração bidirecional.

Dados a coletar:

- máquina onde roda CPlus;
- caminho do banco local;
- versão Firebird;
- credenciais do banco local, configuradas somente na máquina do cliente;
- local ou servidor;
- IP/nome servidor se houver;
- responsável interno;
- horário de acesso remoto;
- WhatsApp principal;
- quantidade de atendentes.

Sugestão comercial:

```txt
Professional: R$ 297/mês
Implantação: R$ 497
Integração piloto CPlus/Firebird: R$ 1.500
Total inicial sugerido: R$ 1.997
```

Facilitado:

```txt
Entrada: R$ 797
Saldo integração: 3x de R$ 400
Mensalidade: R$ 297/mês
```

### Cliente grande em 15 dias

Cliente com aproximadamente 300 atendimentos/dia.

Viável, mas vender como Business ou plano personalizado com implantação assistida.

Antes de ir:

- Hall funcionando como case;
- Lips encaminhada como case técnico;
- checkout/login/ativação estáveis;
- gateway WhatsApp estável;
- histórico e Kanban funcionando;
- proposta pronta.

## Planos comerciais atuais

```txt
Starter: R$ 149/mês | implantação R$ 297 | 2 usuários | 1 WhatsApp
Professional: R$ 297/mês | implantação R$ 497 | 5 usuários | 1 WhatsApp
Business: R$ 597/mês | implantação R$ 997 | 10 usuários | 2 WhatsApps
```

Adicionais:

```txt
Starter: WhatsApp extra R$ 79/mês | usuário extra R$ 29/mês
Professional: WhatsApp extra R$ 97/mês | usuário extra R$ 39/mês
Business: WhatsApp extra R$ 127/mês | usuário extra R$ 49/mês
IA: R$ 79,90/mês
```

Regra definida:

```txt
Mensalidade recorrente mensal sem parcelamento.
Implantação pode ser parcelada no cartão.
```

Parcelamento sugerido da implantação:

```txt
Starter: R$ 297 à vista ou 3x de R$ 109
Professional: R$ 497 à vista ou 3x de R$ 179
Business: R$ 997 à vista ou 4x de R$ 279
```

## Checkout e pagamentos

O checkout usa Asaas.

Configuração sensível deve ficar somente em variáveis seguras da Vercel/Asaas, nunca no repositório.

Estado esperado da cobrança:

- criar cliente no Asaas;
- criar cobrança no Asaas;
- cobrança sem retorno automático obrigatório;
- primeiro teste usando PIX;
- webhook confirma pagamento;
- se checkout pago já tiver vínculo seguro com organização/tenant, ativa automaticamente;
- se não tiver, fica aguardando ativação administrativa.

Arquivo principal:

```txt
app/api/checkout/asaas/route.ts
```

Commits importantes:

```txt
07a926518b2fad4cd2ae121b50f20be9725620ed — removeu callback da cobrança
aef9374b26c1c816ce13f6c83bbda149cdb2b5aa — ajustou cobrança inicial para PIX
```

Identidade financeira sugerida:

```txt
Pagamentos/cobranças: financeiro@moriahsystems.com.br
Suporte/implantação: suporte@shamarconnect.com.br
Site: https://shamarconnect.com.br
```

## Login e OAuth

Decisão de produto:

```txt
Não bloquear venda.
Qualquer pessoa pode logar/cadastrar.
Só acessa painel completo se tiver empresa/plano ativo.
Usuário novo sem empresa ativa deve ir para planos/checkout, não para dashboard.
```

Fluxo correto:

```txt
Visitante → planos → checkout → pagamento → login → ativação/empresa → dashboard
```

## WhatsApp e gateway

Modelo:

```txt
1 cliente = 1 sessão WhatsApp
1 cliente = 1 endpoint_key
1 gateway pode rodar várias sessões
```

Gateway multi-sessão:

```txt
gateway/whatsapp-web
```

Rota de eventos do ShamarConnect:

```txt
POST /api/whatsapp/events
```

Processamento de eventos:

```txt
provider_events → process_pending_whatsapp_provider_events
```

Estado validado anteriormente:

```txt
Conversas: 8
Mensagens: 23
Eventos pendentes: 0
Mídias: 0
Mensagens deletadas: 0
```

## Shamar-Agent

Decisão:

```txt
Instalador único
multiempresa
multiconector
ativado por código
sem acesso direto ao banco central
somente leitura no cliente
configuração local protegida
credencial por instalação
```

Conectores oficiais iniciais:

```txt
woocommerce
cplus_firebird
multipdv
```

Futuros conectores:

```txt
firebird_generic
sql_server
mysql
postgres
excel_csv
api_rest
igreja_erp
eventos
```

Fluxo:

```txt
Instalador único
→ ativação por código
→ API do ShamarConnect valida
→ API devolve configuração daquele cliente
→ Agent lê sistema local
→ Agent envia dados para API do ShamarConnect
→ API grava no banco central
```

## Tabelas importantes já existentes

WhatsApp:

- whatsapp_messages
- whatsapp_conversations
- whatsapp_media_files
- whatsapp_shared_contacts
- whatsapp_shared_locations
- provider_events

CRM:

- quick_replies
- crm_pipeline_stages
- crm_deals
- crm_tasks
- reminders

Financeiro/checkout:

- billing_checkout_sessions
- billing_plan_price_rules
- billing_subscriptions
- finance_invoices
- finance_payments

## Estrutura que ainda precisa criar para Agent no banco

Criar via migration:

```txt
suite_applications
agent_connectors
agent_data_sources
agent_activation_codes
agent_installations
agent_sync_runs
agent_imported_records
```

Objetivo:

- suite_applications: produtos/módulos da Shamar Suite.
- agent_connectors: conectores disponíveis.
- agent_data_sources: fontes por cliente/sistema.
- agent_activation_codes: códigos de ativação.
- agent_installations: instalações físicas do Agent.
- agent_sync_runs: execuções.
- agent_imported_records: registros importados.

## APIs que ainda precisa criar no ShamarConnect

Primeira versão:

```txt
POST /api/agents/activate
POST /api/agents/heartbeat
POST /api/agents/sync
```

Depois especializar:

```txt
POST /api/agents/sync/customers
POST /api/agents/sync/products
POST /api/agents/sync/orders
POST /api/agents/sync/commercial-records
```

## Ordem atual de execução

1. Criar estrutura genérica do Shamar-Agent no Supabase.
2. Criar seeds dos conectores: woocommerce, cplus_firebird, multipdv.
3. Criar APIs do Agent no ShamarConnect.
4. Ajustar login para cliente novo não bloquear venda.
5. Validar checkout Asaas fim-a-fim.
6. Criar/ativar Hall.
7. Criar/ativar Lips.
8. Preparar apresentação/checklist para cliente grande em 15 dias.

## Comando para outro prompt obter este contexto

Como o repositório está público:

```bash
curl -L https://raw.githubusercontent.com/akccastro-allan/Shamar-Connect/main/AI_HANDOFF.md
```

Se estiver no repositório local:

```bash
cat AI_HANDOFF.md
```
