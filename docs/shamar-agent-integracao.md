# Integração Shamar Agent

## Status

Planejado e em implantação.

## Objetivo

O Shamar Agent será o conector local usado para ligar sistemas instalados no servidor do cliente ao ShamarConnect.

O primeiro caso real será a Auto Center Lips, usando o sistema CPlus com banco Firebird local.

## Direção oficial

A comunicação seguirá este fluxo:

```txt
Shamar Agent instalado no cliente
→ API do ShamarConnect
→ Supabase
```

O agente não deve acessar o Supabase diretamente.

## Fluxo oficial do agente

```txt
Instalador
→ Configurador
→ Login
→ Escolha do cliente
→ Escolha do sistema/banco
→ Teste de conexão
→ AgentToken
→ Serviço ativo
→ Sincronização recorrente
```

## Primeira versão

A primeira versão será somente leitura.

O agente poderá:

- Ler produtos.
- Ler preços.
- Ler estoque.
- Ler códigos de barras.
- Ler categorias.
- Ler marcas.
- Ler imagens, se o sistema local permitir.
- Enviar os dados para o ShamarConnect.

O agente não poderá:

- Gravar no banco do cliente.
- Baixar estoque.
- Criar pedido.
- Alterar cadastro.
- Receber SQL remoto.
- Abrir porta de entrada no servidor do cliente.

## Estrutura de banco já preparada

Foram preparadas as tabelas e colunas para integrações:

- `integration_sources`
- `integration_agents`
- `integration_sync_runs`
- `integration_sync_logs`
- `catalog_items` com vínculo por tenant e organização
- `catalog_categories` com vínculo por tenant e organização

## APIs previstas no ShamarConnect

As rotas previstas são:

```txt
POST /api/integrations/agent/login
GET  /api/integrations/agent/available-organizations
POST /api/integrations/agent/bootstrap
POST /api/integrations/agent/health
POST /api/integrations/agent/sync/catalog
POST /api/integrations/agent/logs
```

## Uso temporário de token técnico

Enquanto o login completo da Shamar Suite não estiver pronto, o configurador poderá usar um token técnico temporário para ativação.

Esse token servirá apenas para configuração inicial e deverá ser substituído pelo login real da Shamar Suite.

## Próximos passos

1. Criar as APIs do agente no ShamarConnect.
2. Criar o MVP do Shamar Agent em repositório separado.
3. Testar leitura local do CPlus/Firebird da Lips.
4. Enviar catálogo para o ShamarConnect.
5. Exibir produtos, preços e estoque no atendimento.

## Histórico

### 2026-06-06

- Decidido que o Shamar Agent ficará em repositório separado.
- Criado o repositório `Shamar-Agent`.
- Definido fluxo oficial do agente.
- Preparada a estrutura de banco de integração no ShamarConnect.
