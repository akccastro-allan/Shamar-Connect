# Shamar Connect — MVP vendável para 4 operações

## Objetivo

Construir uma base única do Shamar Connect que funcione para:

1. **Hall Donuts** — restaurante/delivery;
2. **Lips Autopeças / Auto Center** — múltiplos atendentes e setores;
3. **Allan/Moriah** — múltiplas empresas, múltiplos canais e caixa unificada;
4. **Clínica médica** — seis atendentes, alto volume, WhatsApp oficial e supervisão.

Não criar quatro produtos diferentes. Criar um núcleo configurável.

## North Star

> Nenhuma mensagem perdida, nenhuma empresa misturada, nenhuma resposta pela marca errada e nenhuma pessoa presa no robô.

## Posicionamento

O Shamar Connect será uma central:

```text
omnichannel
+ multiempresa
+ multiatendente
+ multicanal
+ com WhatsApp Web e WhatsApp oficial
+ com Instagram Direct e Facebook Messenger
+ com visão de portfólio para gestores
```

## Públicos

### Pequenos clientes

Podem entrar por WhatsApp Web via Evolution para reduzir custo inicial e gerar caixa.

### Clientes críticos

Devem usar Meta Cloud API ou provider oficial equivalente.

### Clientes híbridos

Podem ter alguns canais em Web e outros em API oficial, desde que cada número/canal tenha somente uma conexão ativa.

### Allan / Moriah

Usa o produto como primeiro caso real de portfólio multiempresa:

- Shamar Connect;
- Shamar Kids;
- Shamar Events;
- Shamar ERP;
- Viciados em Trilhas;
- MK Shalom;
- Oriahfin;
- WhatsApp pessoal, em workspace separado.

## Estrutura conceitual

```text
Portfólio
  └── Tenant / Empresa
       └── Organização / Marca
            └── Canal
                 └── Conexão de provider
                      ├── evolution_whatsapp_web
                      ├── meta_whatsapp_cloud
                      ├── meta_instagram
                      └── meta_messenger
```

## Regras não negociáveis

1. Toda conversa tem `tenant_id`, `organization_id` e `channel_id`.
2. Toda mensagem tem `tenant_id`, `organization_id` e `channel_id`.
3. Toda saída usa o `channel_id` da conversa.
4. Não existe canal padrão.
5. Não existe instância Evolution global para envio.
6. Não buscar “primeiro canal da organização”.
7. Webhook nunca confia em tenant ou organização enviados no corpo.
8. O tenant/organização sempre são resolvidos pelo canal cadastrado.
9. Eventos de provider são persistidos antes do processamento.
10. Webhooks são idempotentes.
11. O mesmo evento não cria mensagem duplicada.
12. A interface sempre mostra “Respondendo como”.
13. IA começa assistiva; automação autônoma é exceção.
14. Usuário só vê organizações/canais em que possui vínculo explícito.
15. Grupos não recebem resposta automática.

## Ordem comercial

### 1. Hall Donuts

Objetivo: validar atendimento simples e gerar caixa rápido.

Escopo:

- WhatsApp Web via Evolution;
- caixa de atendimento;
- histórico;
- respostas rápidas;
- mídia;
- status de canal;
- treinamento básico.

### 2. Lips

Objetivo: validar operação multiatendente.

Escopo:

- setores;
- atendente em múltiplos setores;
- assumir conversa;
- transferência;
- notas internas;
- supervisor;
- auditoria;
- fila por setor.

A integração CPlus/Firebird é fase separada e não bloqueia o faturamento do Connect.

### 3. Allan/Moriah

Objetivo: validar portfólio multiempresa.

Escopo:

- seletor de empresa/organização;
- “Todas as empresas autorizadas”;
- filtro por canal;
- WhatsApp Web e oficial;
- Instagram;
- Facebook;
- workspace pessoal isolado;
- destaque forte da marca de resposta.

### 4. Clínica

Objetivo: venda maior e validação de maturidade.

Escopo:

- WhatsApp oficial;
- seis atendentes;
- setores/competências;
- fila;
- SLA;
- supervisão;
- dados fictícios na demonstração;
- automação human-first.

## Fora de escopo até estabilizar os três primeiros ambientes

- IA autônoma clínica;
- chatbot visual complexo;
- campanhas em massa;
- ERP completo;
- fiscal;
- integração profunda com CPlus;
- checkout self-service como bloqueador;
- reescrever a aplicação;
- criar telas específicas hardcoded por empresa.

## Critério de sucesso inicial

O projeto pode começar a vender quando Hall, Lips e Allan estiverem operando com:

- isolamento entre empresas;
- envio pelo canal correto;
- webhook confiável;
- atribuição de conversa;
- histórico preservado;
- erros visíveis e auditáveis.
