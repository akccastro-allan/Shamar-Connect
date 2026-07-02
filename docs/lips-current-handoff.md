# Handoff Atual — Lips / Shamar Connect / Shamar Agent

Data: 2026-07-02  
Status: MVP com autoenvio controlado + cotação simples sem handoff  
Commit HEAD: 85094b0 (fix: trata cotacao simples sem handoff obrigatorio)

---

## 1. Estado Geral

### Prioridades

1. **Lips** — Prioridade concreta AGORA
   - Cliente ativo em negociação/operação
   - MVP em produção
   - Telefone aguardando Evolution API

2. **Viciados em Trilhas** — Operação própria importante, mas secundária
   - Já operando em produção
   - Não bloqueia Lips
   - Melhorias pontuais apenas

3. **Clínica Médica** — Futuro
   - Cliente em negociação
   - ~100 msgs/dia
   - Departamentos + Meta API oficial
   - Fica para depois de Lips consolidada

### Sistema Preparado

- ✅ Shamar Connect: Catálogo, assistente, Evolution API, operação Lips
- ✅ Banco de dados: Migrations 0027/0028/0029 aplicadas em produção
- ✅ Regras de negócio: Autoenvio controlado, cooldown, cotação simples sem handoff
- ✅ Segurança: Endpoints protegidos com token, RLS ativado
- ⏳ Shamar Agent: Repositório separado, preparado para Windows

**Nota:** Shamar Agent é repositório separado (`akccastro-allan/Shamar-Agent`), não integrado neste repo.

---

## 2. Dados da Lips

### Identificação

| Campo | Valor |
|-------|-------|
| **Cliente** | Auto Center Lips |
| **Razão Social** | Autopeças e Lavajato Lips Ltda |
| **CNPJ** | 40.161.564/0001-20 |
| **Ramo** | Autopeças + Lavajato |
| **Localização** | Rio de Janeiro - RJ |

### IDs no Sistema

| Campo | ID |
|-------|-----|
| **tenant_id** | `e6abeaae-29fc-4186-b56a-361a69cb846d` |
| **organization_id** | `8f074193-bf58-4537-9842-720619a9f259` |
| **agent_installation_id** | `adbbbd7e-b88c-4387-8124-99e87fe15aa3` |
| **Canal WhatsApp** | `lips-main` |
| **Catálogo** | `firebird_cplus` (CPlus local) |

### Contato Operacional

- **Proprietário:** Allan Castro
- **Email:** akccastro.allan@gmail.com
- **Telefone Lips:** +55 21 98087-8805 (recebe mensagens)
- **Telefone Allan:** +55 21 98141-1499 (testa/valida)

---

## 3. Horário da Lips

| Período | Horário |
|---------|---------|
| **Segunda a Sexta** | 08:00 - 18:00 |
| **Sábado** | 08:00 - 15:00 |
| **Domingo** | Fechado |
| **Feriados** | Verificar calendário local |
| **Timezone** | America/Sao_Paulo (UTC-3 / UTC-2 DST) |

**Comportamento fora do horário:**
- Mensagens são recebidas pela Central
- Autoresposta está ativa mesmo fora do horário
- Humano só vê/responde durante o horário comercial
- Sugestões automáticas continuam disponíveis para cotação

---

## 4. Regras de Atendimento

### Roteamento por Departamento

#### **Balcão** (Peças / Produtos / Comércio)

- Consultas de preço
- Consultas de estoque
- Orçamentos consultivos
- Pedidos de peças
- Perguntas sobre produtos
- **SLA:** 30 minutos dentro do horário comercial
- **Roteamento automático:** Sim, quando há `purchase_intent`

#### **Oficina** (Serviços / Agendamento)

- Solicitações de serviço
- Agendamento
- Troca de óleo
- Revisão
- Alinhamento
- Balanceamento
- Diagnóstico
- Instalação de peças
- **SLA:** 50 minutos dentro do horário comercial
- **Roteamento automático:** Sim, quando há `service_intent`

### Escalação

- **Escalado para:** Papel `supervisor` (não pessoa fixa)
- **Supervisor atual:** André
- **Próximo:** Qualquer usuário com role `supervisor`
- **Caso urgente:** Atribui a supervisor + notifica

---

## 5. Regra de Autoenvio

### ✅ Autoenvio Permitido

- Saudação simples (Bom dia, olá, tudo bem)
- Pedido de dado faltante (ano do veículo, marca, código)
- Consulta de preço ("Quanto custa...")
- Consulta de estoque ("Tem...")
- Orçamento inicial consultivo
- Produto não encontrado
- Produto sem estoque
- Encaminhamento inicial para departamento

**Exemplo permitido:**
```
Cliente: "Quanto está o disco de freio do Corsa 99/00?"
Sistema: "Encontrei no catálogo da Lips:
          Produto: Disco Freio Dianteiro Corsa 99/00
          Valor: R$ 150,00
          Estoque na última sincronização: 2 unidades
          
          Esses dados são da última atualização do sistema.
          O balcão confirma aplicação e disponibilidade certinha antes de finalizar.
          
          Posso te ajudar com mais alguma peça?"
```

### ❌ Autoenvio Proibido

Nunca enviar automaticamente:

- Venda fechada
- Reserva de produto
- Confirmação final de estoque
- Garantia de aplicação
- "pode vir buscar"
- "separei para você"
- "produto reservado"
- Link de pagamento
- PIX / Cartão / Boleto
- Fechamento de compra
- Agendamento confirmado

### 🔴 Handoff Humano Obrigatório

Quando cliente mencionar:

- "quero comprar"
- "vou querer"
- "separa" / "pode separar"
- "reserva"
- "vou buscar"
- "fecha" / "fechar"
- "pagamento"
- "pix"
- "cartão"
- "boleto"
- "manda link"
- "entrega"
- "retirar"
- "quero instalar"
- "pode instalar"
- "agenda pra mim"
- "marcar horário"
- "quero fazer o serviço"

**Resposta automática permitida neste caso:**
```
"Perfeito. Vou encaminhar para o setor responsável confirmar 
aplicação, disponibilidade e forma de pagamento certinha antes de finalizar."
```

**Depois:**
- `requiresHandoff = true`
- `handoffReason = purchase_intent` ou `service_request`
- `department = Balcão` (peças/compra) ou `Oficina` (serviço)
- Status conversa: `pending`
- Humano assume via Central

### 📊 Consulta Simples NÃO Gera Handoff

**Nova regra (commit 85094b0):**

Cotação consultiva = `quoteOnly: true`, `requiresHandoff: false`

**Comportamento:**
- Responde automaticamente com preço/estoque
- Menciona "última sincronização"
- Pergunta se pode ajudar em algo mais
- Status conversa: `awaiting_customer`
- **NÃO escala para Balcão automaticamente**
- **NÃO chama supervisor**
- Cliente pode voltar depois com outra peça
- Não reclama se cliente não responder

**Exemplo:**
```
Cliente: "Qual o valor do filtro de óleo do Corolla 2015?"
Sistema: Responde com preço/estoque
         Status: awaiting_customer
         Não escala
         
Cliente volta 20 min depois: "E a pastilha de freio?"
Sistema: Responde como nova cotação (não reclama da ausência anterior)
```

---

## 6. Cooldown

### Configuração

- **Intervalo mínimo:** 5 minutos
- **Variável env:** `AUTO_REPLY_COOLDOWN_MINUTES` (default: 5)

### Regras de Aplicação

1. **Máximo 1 resposta automática por conversa em 5 minutos**
   - Se cliente perguntar novamente em menos de 5 min com a mesma peça/pergunta
   - Sistema bloqueia e salva sugestão

2. **Não repetir mesma resposta em sequência**
   - Se última resposta foi "Disco freio custa R$ 150"
   - E cliente pergunta novamente
   - Sistema não envia a mesma resposta automaticamente

3. **Não autoenviar se última mensagem outbound foi do sistema**
   - Evita loop de sistema respondendo a si próprio

4. **Permitir nova resposta se peça diferente**
   - Cliente pergunta disco de freio → sistema responde (cooldown registra)
   - Cliente pergunta filtro de óleo → sistema responde (peça diferente, permite)

5. **Registrar motivo ao bloquear**
   - `blocked_by = "cooldown_active"` / `"duplicate_response"` / `"last_message_was_outbound"`
   - Sugestão preservada para humano revisar

### Timeout de 10 Minutos

⚠️ **Importante:** Esta é uma **sugestão operacional**, não automação garantida.

- `idleCloseAfterMinutes = 10` é salvo como metadado
- **Sem worker/cron ativo:** Sistema NÃO envia nova mensagem automaticamente após 10 min
- **Sem worker/cron ativo:** Sistema NÃO escala automaticamente
- Humano pode revisar conversa em `awaiting_customer` quando quiser
- Processo futuro on-demand pode marcar `auto_quote_idle` após 10 min (não implementado)

---

## 7. Catálogo CPlus

### Sincronização

- **Status:** ✅ Sincronização completa realizada com sucesso
- **Quantidade:** 17.281 produtos sincronizados no Supabase
- **Fonte:** Firebird CPlus local (`firebird_cplus`)
- **Banco CPlus:** Firebird 2.5
- **Caminho base:** `C:\cplus\`

### Dados Sincronizados

| Campo | Incluído | Notas |
|-------|----------|-------|
| **Nome** | ✅ | Texto completo do produto |
| **Descrição** | ✅ | Descrição técnica |
| **Preço** | ✅ | Preço unitário |
| **Estoque** | ✅ | Quantidade disponível |
| **Código/SKU** | ✅ | Referência técnica |
| **Categoria** | ✅ | Classificação interna |
| **Marca** | ✅ | Fabricante |
| **Imagens/BLOB** | ❌ | Não sincronizadas nesta fase |

### Restrições Operacionais

- ✅ **Somente SELECT** do Firebird — nenhuma escrita
- ❌ **Sem baixa de estoque** — não sincroniza automaticamente
- ❌ **Sem edição no CPlus** — tudo é consultivo
- ❌ **Sem BLOB/imagens** — armazenamento futuro

### Vantagem

Catálogo no Supabase permite atendimento mesmo quando:
- CPlus está desligado/offline
- Horário noturno
- Sábado/domingo fora do horário

**Sempre mencionar:** "Esses dados são da última sincronização do sistema."

### Atualização Futura

- Sync manual conforme necessidade
- Sync automática pode ser adicionada via Shamar Agent
- CPlus mudanças não refletem em tempo real

---

## 8. Buscas e Sinônimos

### Problema Originário

Produtos no CPlus podem ter nomes técnicos/abreviados que não correspondem diretamente ao que o cliente pergunta.

**Exemplo:**
- Cliente pergunta: "Pastilha de freio"
- CPlus pode ter: "PLAQUETA FREIO DIANT", "KIT PASTILHA", "DISCO FREIO"

### Sinônimos Implementados

| Busca do Cliente | Expandido Para | Exemplos CPlus |
|------------------|----------------|----------------|
| pastilha | freio, plaqueta, kit pastilha | PLAQUETA FREIO, DISCO FREIO, KIT PASTILHA |
| óleo / oleo | lubrificante | ÓLEO 5W30, LUBRIFICANTE MULTIUSO |
| filtro de óleo | filtro oleo, filtro óleo, filtro lubrificante | FILTRO ÓLEO MOTOR, FILTRO LUBRIFICANTE |
| amortecedor | amort, amort diant, amort tras | AMORT DIANT, AMORT TRAS, AMORTECEDOR |
| corolla cross | corolla, cross | COROLLA 2020, CROSS 2023 |

### Implementação

Função `detectPiecesRequested()` em `lips-simple-processor.ts`:
- Mapeia palavras-chave do cliente
- Expande busca no catálogo com variações
- Retorna matches encontrados
- Fallback para "não encontrado" com sugestão de enviar foto/código

### Manutenção

- Adicionar sinônimos conforme feedback de atendimento
- Revisar logs de "produto não encontrado"
- Atualizar regex quando novos padrões aparecerem

---

## 9. Evolution API / Telefone

### Configuração Atual

- **Canal:** `lips-main`
- **Provider:** Evolution API (Baileys)
- **Tipo:** WhatsApp oficial via Evolution
- **Outros canais:** Continuam com WhatsApp Web (RFC alternativa)

### Clientes Criados

| Endpoint | Método | Propósito | Auth |
|----------|--------|-----------|------|
| `/api/evolution/diagnostics` | GET | Verificar status Evolution | ✅ Required |
| `/api/evolution/qr` | GET | Gerar QR code para conectar | ✅ Required |

**Segurança:**
- Endpoints exigem autenticação (`getRequiredAppContext`)
- Nunca retornam `EVOLUTION_API_KEY`
- Instance ID é mascarado
- Logs não expõem tokens

### Webhook Esperado

```
POST https://shamarconnect.com.br/api/webhooks/evolution
```

**Headers:** Conforme Evolution API (bearer token ou custom)  
**Body:** Payload de mensagem recebida (WhatsApp → Evolution → webhook → Shamar Connect)

**Processamento:**
1. Webhook recebe mensagem
2. Cria job em `agent_automation_jobs` (status: pending)
3. Processor `/api/agents/lips/process-jobs` pega job
4. Processa com agent
5. Envia resposta (se autoSendAllowed) via Evolution
6. Salva no histórico

### Teste Real

- ⚠️ **Teste local NÃO funciona** — Evolution exige domínio público + webhook real
- ✅ **Teste em produção:** Enviar real mensagem via +55 21 98087-8805
- Resposta esperada em ~3-5 segundos

---

## 10. Endpoints Principais

### Agente / Operação

| Endpoint | Método | Autenticação | Propósito |
|----------|--------|--------------|-----------|
| `/api/agents/activate` | POST | App context | Ativar agente para cliente |
| `/api/agents/heartbeat` | POST | App context | Health check do agente |
| `/api/agents/sync` | POST | App context | Disparar sync manual |
| `/api/agents/maintenance` | POST | App context | Tarefas manutenção periódica |

### Lips Específico

| Endpoint | Método | Autenticação | Propósito |
|----------|--------|--------------|-----------|
| `/api/agents/lips/process-jobs` | POST | x-processor-token | Processar fila de jobs (autoenvio) |
| `/api/agents/lips/test-simple` | POST | None (dev) | Testar agent logic sem banco |
| `/api/agents/lips/test-cooldown` | POST | x-processor-token | Testar cooldown (prod protected) |

### Catálogo / Assistente

| Endpoint | Método | Autenticação | Propósito |
|----------|--------|--------------|-----------|
| `/api/catalog/search` | POST | App context | Buscar produtos no catálogo |
| `/api/catalog/assist` | POST | App context | Sugerir resposta com contexto |

### Evolution / Diagnóstico

| Endpoint | Método | Autenticação | Propósito |
|----------|--------|--------------|-----------|
| `/api/evolution/diagnostics` | GET | App context | Status da conexão Evolution |
| `/api/evolution/qr` | GET | App context | QR code para conectar WhatsApp |

### Webhooks

| Endpoint | Método | Autenticação | Propósito |
|----------|--------|--------------|-----------|
| `/api/webhooks/evolution` | POST | Evolution token | Receber mensagens WhatsApp |

### Admin / Setup

| Endpoint | Método | Autenticação | Propósito |
|----------|--------|--------------|-----------|
| `/api/admin/setup-lips` | POST | Admin role | Primeira vez setup Lips |

---

## 11. Migrations

### Estado Atual

| ID | Nome | Status | Descrição |
|----|------|--------|-----------|
| 0027 | `integration_sources` + catálogo base | ✅ Aplicada | Tabelas: sources, agents, sync_runs, categories, items |
| 0028 | Campos extras de catálogo/agente | ✅ Aplicada | Metadados, integrações, configurações |
| 0029 | Correção stock_available numeric | ✅ Aplicada | Tipo de dado para estoque |
| 0030 | Agent automation jobs/cooldown | ⏳ Pronto | Fila de automação + cooldown |

### Migration 0030

**Status:** Arquivo criado, pronto para aplicar  
**Locação:** `supabase/migrations/0030_agent_automation_jobs.sql`

**Tabelas:**
- `agent_automation_jobs` — Fila de jobs para autoenvio
- `agent_automation_cooldown` — Registro de cooldown por conversa

**Aplicar apenas se:**
- Não foi aplicada ainda (verificar no Supabase)
- Após revisão/autorização final
- Não é destrutiva (CREATE TABLE IF NOT EXISTS)

**Verificar:**
```sql
SELECT * FROM information_schema.tables 
WHERE table_name IN ('agent_automation_jobs', 'agent_automation_cooldown')
AND table_schema = 'public';
```

Se retornar 2 linhas, já foi aplicada.

---

## 12. Variáveis de Ambiente

### Obrigatórias em Produção

| Variável | Tipo | Exemplo | Obrigatório |
|----------|------|---------|------------|
| `SHAMAR_AGENT_SETUP_TOKEN` | String | (não mostrar) | ✅ Sim |
| `LIPS_PROCESSOR_TOKEN` | String | (não mostrar) | ✅ Sim |
| `EVOLUTION_API_URL` | URL | `https://api.evolution.com` | ✅ Sim |
| `EVOLUTION_API_KEY` | String | (não mostrar) | ✅ Sim |
| `EVOLUTION_INSTANCE_ID` | String | (não mostrar) | ✅ Sim |

### Opcionais / Configuração

| Variável | Tipo | Default | Propósito |
|----------|------|---------|-----------|
| `AUTO_REPLY_COOLDOWN_MINUTES` | Integer | 5 | Cooldown em minutos |
| `CRON_SECRET` | String | (vazio) | Futuro: autenticação de cron |

### Não Commitar

- ❌ `.env.local` (arquivo de desenvolvimento)
- ❌ `agent.env` (Shamar Agent config)
- ❌ `INSTALL_CONFIG.env` (ZIP setup)
- ❌ Nenhum arquivo `.env*` com valores reais

---

## 13. Shamar Agent

### Repositório Separado

- **Git:** `akccastro-allan/Shamar-Agent`
- **Tecnologia:** C# / Windows Service
- **Interação com Shamar Connect:** Chamadas HTTP às APIs

**Não tocar em ShamarConnect repo.**

### Instalação (Windows)

| Aspecto | Localização |
|---------|------------|
| **Executável** | `C:\Program Files\Moriah Systems\Shamar Agent\` |
| **Configuração** | `C:\ProgramData\Moriah Systems\Shamar Agent\agent.env` |
| **Dados/Estado** | `C:\ProgramData\Moriah Systems\Shamar Agent\data\sync-state.json` |
| **Logs** | `C:\ProgramData\Moriah Systems\Shamar Agent\logs\` |

### Comportamento

**Inicialização:**
- Inicia com Windows (serviço)
- Faz sync ao ligar
- Carrega `agent.env`

**Agendamento:**
- Sync às 12:00 (meio-dia)
- Sync às 17:00 (5 da tarde)
- Futuro: sync de hora em hora

**Tarefas:**
- Sincronizar CPlus → Supabase (catálogo)
- Manutenção de jobs pendentes
- Limpeza de logs antigos

### Arquivos NÃO Commitar

- ❌ `agent.env` (valores reais)
- ❌ `INSTALL_CONFIG.env` (setup ZIP)
- ❌ Firebird DBs: `*.fdb`, `*.gdb`, `*.fbk`, `*.bak`
- ❌ CPlus configs: `Conexao.ini`, `CPlus.ini`
- ❌ Logs: `*.log`

### Contato Suporte

- Check logs em `C:\ProgramData\Moriah Systems\Shamar Agent\logs\`
- Verificar `sync-state.json` para entender último sucesso
- Revisar `agent.env` para credenciais

---

## 14. Pendências Imediatas

### Bloqueadores (Fazer ANTES de operação real)

- [ ] Confirmar deploy final em produção (commit 85094b0 ativo)
- [ ] Aplicar/confirmar migration 0030 no banco
- [ ] Configurar `LIPS_PROCESSOR_TOKEN` no Vercel (variável de ambiente)
- [ ] Conectar telefone via Evolution (QR code)
- [ ] Confirmar webhook Evolution recebendo mensagens
- [ ] Testar `/api/agents/lips/process-jobs` com token válido

### Testes Funcionais (Fazer com Lips ao vivo)

- [ ] Enviar mensagem pelo +55 21 98087-8805
- [ ] Receber resposta automática (saudação)
- [ ] Testar cotação simples ("Quanto custa disco de freio?")
- [ ] Testar coodown (mesma pergunta em menos de 5 min — deve bloquear)
- [ ] Testar nova peça (depois de bloquear, perguntar filtro — deve responder)
- [ ] Testar compra ("Vou querer, separa pra mim" — deve ir para Balcão)
- [ ] Testar agendamento ("Quero agendar troca de óleo" — deve ir para Oficina)
- [ ] Testar pagamento ("Manda o pix" — deve ir para humano, SEM enviar PIX)
- [ ] Verificar status da conversa na Central
- [ ] Testar resposta humana via Central
- [ ] Testar busca no catálogo
- [ ] Testar assistente recomendando peça

### Documentação/Conformidade

- [ ] Revisar docs/lips-current-handoff.md com Allan
- [ ] Confirmar IDs públicos corretos
- [ ] Garantir nenhum secret exposto
- [ ] Testar acesso de novo atendente (permissões)

---

## 15. O Que NÃO Está Incluso Nesta Fase

### Escopo MVP (Não fazer agora)

- ❌ **Imagens/BLOB de produtos** — Somente texto
- ❌ **E-commerce integrado** — Sem carrinho/checkout
- ❌ **Baixa automática de estoque** — Somente SELECT
- ❌ **Pedido automático no CPlus** — Somente sugestão
- ❌ **Emissão fiscal** — Integração futura
- ❌ **Google Agenda** — Somente WhatsApp
- ❌ **Automação total sem humano** — Sempre há handoff para compra/serviço
- ❌ **Vercel Cron** — Não disponível no plano free
- ❌ **Meta/Instagram/Facebook público** — Somente WhatsApp interno

### Versão Futura

- ⏳ **Sync automática CPlus** — Worker/cron externo
- ⏳ **Timeout 10 min automático** — Quando houver cron
- ⏳ **Imagens de produtos** — Storage + CDN
- ⏳ **Clínica Médica** — Cliente novo, depois de Lips consolidada
- ⏳ **Departamentos avançados** — Fila, atribuição dinâmica
- ⏳ **Relatórios SLA** — Dashboard de performance
- ⏳ **Meta API oficial** — Substituir Evolution (opcional)

---

## 16. Padrão de Qualidade

### Git / Commits

- ✅ Typecheck passa antes de push
- ✅ Build passa antes de push
- ✅ Sem secrets commititados
- ✅ Sem dados reais em massa
- ✅ Mensagem de commit clara e objetiva
- ❌ Não pushear branches beta públicas

### Código

- ✅ TypeScript strict mode
- ✅ Sem `any` tipos
- ✅ Sem console.log em produção
- ✅ Tratamento de erro explícito
- ✅ RLS ativado em todas as tabelas sensíveis
- ❌ Não deixar funcionalidade beta pública
- ❌ Não deixar endpoint desprotegido sem razão

### Aparência

- ✅ Interface limpa e profissional
- ✅ Mensagens amigáveis ao usuário
- ✅ Sem expor termos técnicos desnecessários
- ✅ Respostas em português claro
- ❌ Não parecer beta / protótipo

### Segurança

- ✅ Tokens mascarados
- ✅ RLS em força
- ✅ Validação de entrada
- ✅ Rate limit se aplicável
- ✅ Logs sem dados sensíveis
- ❌ Não expor stack traces ao usuário final
- ❌ Não retornar erro técnico sem necessidade

### Dados

- ✅ Reversível (sem DELETE permanente)
- ✅ Documentado (migração + ADR)
- ✅ Testado (antes de produção)
- ✅ Com rollback se falhar
- ❌ Não fazer mudança destrutiva sem backup
- ❌ Não confiar em backup sem testar restore

---

## Referência Rápida

### Commando Úteis

```bash
# Verificar antes de push
npm run typecheck
npm run build

# Verificar migrations aplicadas
# (via Supabase SQL Editor)
SELECT name FROM _migrations ORDER BY name DESC LIMIT 5;

# Logs do Shamar Agent
C:\ProgramData\Moriah Systems\Shamar Agent\logs\

# Config Shamar Agent
C:\ProgramData\Moriah Systems\Shamar Agent\agent.env
```

### Contatos

| Papel | Pessoa | Email | Telefone |
|-------|--------|-------|----------|
| Cliente/Proprietário | Allan Castro | akccastro.allan@gmail.com | +55 21 98141-1499 |
| Supervisor Balcão | André | — | — |
| Desenvolvedor | — | — | — |

### Links Produção

- **Shamar Connect:** https://shamarconnect.com.br
- **API Base:** https://shamarconnect.com.br/api
- **GitHub:** https://github.com/akccastro-allan/Shamar-Connect

---

**Data última atualização:** 2026-07-02  
**Commit:** 85094b0  
**Status:** MVP com autoenvio controlado ✅
