# Estratégia de Conteúdo — ShamarConnect

Objetivo: construir autoridade orgânica até 30/06 e além, através de conteúdo útil, indexável e diretamente ligado aos problemas reais das empresas que usam o ShamarConnect.

Sem campanhas pagas. Sem alterar operação. Sem alterar WhatsApp.

---

## Princípios

1. **Problema real antes de SEO** — cada artigo responde uma pergunta real que um gestor faz antes de comprar.
2. **Casos reais têm prioridade** — Hall Donous, Viciados, MK Shalom e Oriahfin geram conteúdo de verdade quando estiverem operando.
3. **Consistência > volume** — 1 artigo bom por semana vale mais que 5 rasos.
4. **CTA único** — todo artigo do blog leva para `/planos` ou `/login`.

---

## Categorias

| Slug | Label | Foco |
|------|-------|------|
| `whatsapp` | WhatsApp | Organização, velocidade, multi-atendente |
| `crm` | CRM | Pipeline, Kanban, funil de vendas |
| `atendimento` | Atendimento | Processo, indicadores, equipe |
| `ia` | IA | Transcrição, sugestão, supervisão humana |
| `vendas` | Vendas | Follow-up, orçamentos, fechamento |
| `organizacao` | Organização | Histórico, prioridades, rotina operacional |

---

## Artigos publicados (24)

### WhatsApp (5)
- Como reduzir o tempo de resposta no WhatsApp da empresa ⭐
- Como usar respostas rápidas sem deixar o atendimento robótico
- Respostas rápidas no WhatsApp: como padronizar o atendimento
- Como responder clientes mais rápido no WhatsApp sem perder qualidade
- Atendimento multiatendente no WhatsApp: quando usar

### CRM (4)
- CRM com WhatsApp: como funciona na prática ⭐
- CRM para equipe comercial: como organizar vendedores e atendentes
- CRM para WhatsApp: como organizar vendas e atendimento em um só lugar
- Melhor CRM para pequenas empresas: como escolher sem complicar

### Atendimento (4)
- Atendimento comercial pelo WhatsApp: como criar um processo simples ⭐
- Como organizar o histórico de clientes no WhatsApp
- Como controlar atendentes no WhatsApp sem perder qualidade
- Indicadores de atendimento no WhatsApp: o que o gestor precisa acompanhar

### IA (2)
- IA no atendimento pelo WhatsApp: como usar sem perder o toque humano ⭐
- Transcrição de áudio no WhatsApp: por que isso ajuda no atendimento

### Vendas (6)
- Funil de vendas no WhatsApp: como acompanhar cada cliente ⭐
- Como não perder vendas que chegam pelo WhatsApp
- Como saber se sua equipe está perdendo vendas no WhatsApp
- Como transformar conversas do WhatsApp em oportunidades de venda
- Como acompanhar orçamentos enviados pelo WhatsApp
- Como organizar clientes no WhatsApp sem perder vendas

### Organização (3)
- Como organizar atendimento, vendas e CRM em uma única operação ⭐
- Como organizar prioridades no atendimento pelo WhatsApp
- Como organizar o follow-up de vendas pelo WhatsApp

⭐ = artigo em destaque na página do blog

---

## Calendário Editorial — Junho 2026

| Data | Título sugerido | Categoria | Empresa-âncora | Status |
|------|----------------|-----------|----------------|--------|
| 19/06 | Caso Real: como o Hall Donous organizou atendimento com WhatsApp | Atendimento | Hall Donous | Aguardando operação |
| 21/06 | Como criar SLA de atendimento no WhatsApp | Atendimento | Geral | A criar |
| 23/06 | Caso Real: Viciados em Trilhas e o problema de inscrições pelo WhatsApp | WhatsApp | Viciados | Aguardando operação |
| 25/06 | Como usar IA para resumir conversas longas no WhatsApp | IA | Geral | A criar |
| 27/06 | Pipeline comercial: como funciona na prática com WhatsApp | CRM | Geral | A criar |
| 30/06 | O que muda no atendimento quando você começa a usar CRM de verdade | CRM | Geral | A criar |

---

## Calendário Editorial — Julho 2026

| Data | Título sugerido | Categoria | Empresa-âncora | Status |
|------|----------------|-----------|----------------|--------|
| 02/07 | Como organizar grupos do WhatsApp sem responder automaticamente | WhatsApp | Hall Donous | A criar |
| 05/07 | Caso Real: MK Shalom e comunicação com membros pelo WhatsApp | Atendimento | MK Shalom | Aguardando operação |
| 08/07 | Como saber se a IA está ajudando ou atrapalhando seu atendimento | IA | Geral | A criar |
| 11/07 | Vendas B2B pelo WhatsApp: o que é diferente | Vendas | Oriahfin | A criar |
| 14/07 | Caso Real: Oriahfin e CRM financeiro com WhatsApp | CRM | Oriahfin | Aguardando operação |
| 17/07 | Como treinar uma equipe nova no ShamarConnect em menos de 1 hora | Organização | Geral | A criar |
| 21/07 | Checklist: operação de atendimento no WhatsApp sem falhas | Organização | Geral | A criar |

---

## Casos Reais — estrutura de cada artigo

Quando uma empresa atingir 30 dias de operação real, publicar:

```
1. Contexto da empresa (segmento, tamanho da equipe, problema anterior)
2. O problema antes do ShamarConnect
3. Como foi a implantação (tempo, etapas, dificuldades)
4. O que mudou (métricas reais, se disponíveis)
5. O que ainda está em evolução
6. CTA: como contratar
```

Empresas-alvo:
- [ ] Hall Donous — moda masculina, Rio de Janeiro
- [ ] Viciados em Trilhas — turismo, trilhas e experiências
- [ ] MK Shalom — comunidade e eventos, comunicação pastoral
- [ ] Oriahfin — financeiro, CRM comercial B2B

---

## Estrutura técnica

- Artigos em `app/(site)/blog/[slug]/page.tsx`
- Metadados por artigo: `title`, `description`, `openGraph`
- Categorias via URL: `/blog?categoria=whatsapp`
- Destaque via `featured: true` em `lib/blog/posts.ts`
- Casos Reais como componente separado `components/site/blog-casos-reais.tsx`
- `lib/blog/posts.ts` é a fonte única de dados — adicionar novos artigos aqui primeiro

---

## KPIs orgânicos (acompanhar no Google Search Console)

- Impressões/semana para termos "CRM WhatsApp", "atendimento WhatsApp", "WhatsApp empresa"
- Cliques orgânicos → `/blog` → `/planos`
- Posição média das top-5 páginas do blog
- Taxa de conversão blog → cadastro

---

## O que NÃO fazer

- Não criar conteúdo de redes sociais neste módulo
- Não criar campanhas pagas
- Não alterar operação, WhatsApp ou automações para gerar conteúdo
- Não publicar caso real sem validar com Allan que os dados são precisos
