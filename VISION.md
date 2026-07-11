# Moriah Systems — Visão do Ecossistema

## 1. Propósito

A Moriah Systems desenvolve produtos digitais para organizar empresas, pessoas, comunicação, atendimento, finanças, eventos e operações em um ecossistema simples, integrado e confiável.

A tecnologia deve reduzir complexidade para o usuário sem perder precisão empresarial.

Princípio central:

> O usuário vê simplicidade.  
> O sistema registra com precisão.

Nenhum produto da Moriah deve parecer beta, improvisado, incompleto ou apenas um template adaptado.

Mesmo uma primeira versão deve transmitir:

- confiança;
- clareza;
- organização;
- valor;
- segurança;
- qualidade;
- continuidade.

Política permanente de módulos:

> A Moriah não publica módulos incompletos como beta comercial. Cada canal permanece invisível até passar por desenvolvimento, testes, homologação, segurança, documentação e operação real.

Ciclo obrigatório:

```text
desenvolvimento interno
→ teste automatizado
→ teste em ambiente controlado
→ uso interno
→ homologação
→ documentação
→ ativação comercial
```

Nenhum canal ou módulo comercial deve aparecer como parcialmente funcional. WhatsApp, Instagram, Facebook, TikTok, e-mail, IA e qualquer canal futuro só ficam visíveis ao cliente quando estiverem completos, protegidos server-side e operáveis ponta a ponta.

---

## 2. O ecossistema Moriah

O ecossistema é formado por empresas, operações próprias, produtos e capacidades compartilhadas.

### Corporativo

- Moriah Systems;
- Allan / Pessoal.

### Operações próprias

- MK Shalom;
- Viciados em Trilhas.

### Produtos Moriah / Shamar

- Shamar Connect;
- Shamar ERP;
- Shamar Church;
- Shamar Kids;
- Shamar Events;
- OriahFin;
- futuros produtos.

Cada produto possui responsabilidades próprias, mas todos devem poder compartilhar autenticação, permissões, auditoria, comunicação e inteligência operacional.

---

## 3. Centro de Comando

O Centro de Comando é o cockpit interno do Allan e da Moriah Systems.

Ele não é a administração comercial do Shamar Connect.

Ele não é uma lista de clientes SaaS.

Ele não deve misturar empresas próprias com clientes externos.

O Centro de Comando existe para permitir que Allan acompanhe e opere:

- empresas próprias;
- marcas;
- produtos;
- canais;
- caixas de entrada;
- atendimentos;
- prioridades;
- alertas;
- indicadores;
- projetos;
- eventos;
- comunicação;
- financeiro;
- oportunidades;
- futuras recomendações assistidas por IA.

O usuário não deve precisar pensar primeiro em qual sistema abrir.

Ele deve poder navegar pela necessidade:

- Comunicação;
- Empresas;
- Produtos;
- Financeiro;
- Projetos;
- Eventos;
- Pessoas;
- Alertas;
- Inteligência operacional.

O Centro de Comando é inicialmente interno.

Configuração conceitual:

```ts
{
  internalOnly: true,
  productizable: true,
  commercialEnabled: false,
  aiMode: "off"
}
```

No futuro, partes dele poderão se tornar produto comercial, mas isso só ocorrerá depois de validação interna real.

---

## 4. Administração do Shamar Connect

A Administração do Shamar Connect é separada do Centro de Comando.

Ela é responsável por:

* clientes;
* tenants;
* organizações;
* canais;
* planos;
* assinaturas;
* usuários;
* implantação;
* integrações;
* providers;
* automações;
* suporte SaaS;
* auditoria;
* faturamento;
* saúde da plataforma.

Exemplos de clientes do Shamar Connect:

* Lips;
* Hall;
* NutriFlow;
* futuros clientes.

Clientes externos não aparecem como empresas próprias no Centro de Comando.

---

## 5. Shamar Connect

O Shamar Connect é o motor de comunicação, interação, atendimento e relacionamento da Moriah Systems.

Ele não é apenas um CRM.

Ele não é apenas um chatbot.

Ele não é apenas um disparador de mensagens.

Ele combina:

* inbox unificada;
* atendimento multiusuário;
* filas;
* departamentos;
* responsáveis;
* supervisores;
* SLA;
* histórico persistente;
* tags;
* notas internas;
* funil;
* automação por regra;
* catálogo consultivo;
* consulta de preços;
* handoff humano;
* múltiplos canais;
* múltiplos providers;
* integrações;
* IA assistiva futura.

Referência conceitual interna:

> ManyChat + central de atendimento + operação omnichannel + inteligência operacional.

Essa referência não deve ser usada como nome ou cópia visual do produto.

---

## 6. Inbox unificada

A inbox poderá reunir mensagens de múltiplos canais em uma única fila.

Fila única não significa perder a origem.

Toda conversa deve preservar:

* pessoa/contato;
* empresa ou produto de origem;
* canal;
* número ou conta;
* provider;
* finalidade do canal;
* fila;
* departamento;
* responsável;
* status;
* prioridade;
* histórico;
* tags;
* campanha, quando existir.

Exemplos:

```text
Maria
Viciados em Trilhas · WhatsApp · Atendimento
```

```text
Juliana
Viciados em Trilhas · Instagram · Direct
```

```text
Mônica
Shamar Kids · WhatsApp Oficial · Suporte/Vendas
```

Cada número ou conta representa um canal próprio.

A origem deve ser derivada do canal:

```text
channel_id → empresa/produto/operação
```

---

## 7. Canais

O ecossistema deve estar preparado para:

* WhatsApp Conectado;
* WhatsApp Oficial Meta;
* Instagram;
* Facebook;
* TikTok;
* e-mail;
* site/formulário;
* chat;
* outros canais futuros.

A integração deve ser organizada por adapters/providers.

Exemplo conceitual:

```text
WhatsApp Adapter
Meta WhatsApp Adapter
Instagram Adapter
Facebook Adapter
TikTok Adapter
Email Adapter
OpenAI Assistant Adapter
```

Nenhum provider deve dominar toda a arquitetura.

---

## 8. Finalidade dos canais

Uma empresa ou produto pode possuir múltiplos canais com finalidades diferentes.

Exemplo: Shamar Kids.

### Comunicação com pais

* avisos;
* comunicados;
* lembretes;
* notificações;
* templates oficiais;
* uso predominantemente outbound.

### Suporte / atendimento / vendas

* dúvidas;
* suporte;
* matrícula;
* atendimento humano;
* vendas;
* financeiro;
* automações;
* fila bidirecional.

Cada canal deve possuir finalidade e política de direção.

Exemplo conceitual:

```ts
type ChannelPurpose =
  | "support"
  | "sales"
  | "support_sales"
  | "parents_communication"
  | "broadcast"
  | "notifications"
  | "internal_admin"
  | "catalog_quotes"
  | "general";

type ChannelDirectionPolicy =
  | "two_way"
  | "outbound_only"
  | "inbound_only"
  | "restricted_inbound";
```

---

## 9. WhatsApp Conectado e WhatsApp Oficial

O Shamar Connect deve suportar dois modelos distintos.

### WhatsApp Conectado

Providers baseados em sessão web, como OpenWA.

Uso:

* implantação rápida;
* validação;
* clientes pequenos;
* MVP;
* operações internas;
* menor custo inicial.

Exemplo atual:

* Lips.

### WhatsApp Oficial

WhatsApp Business Platform / Cloud API da Meta.

Uso:

* conformidade;
* escala;
* templates;
* notificações;
* número oficial;
* maior previsibilidade;
* clientes com maior exigência operacional.

Primeiro caso planejado:

* Shamar Kids.

O produto nunca deve chamar WhatsApp Conectado de WhatsApp Oficial.

---

## 10. Automação por regra

O produto base utiliza automação por regra.

Automação por regra pode:

* responder saudações;
* mostrar menus;
* consultar catálogo;
* informar preços cadastrados;
* informar dados seguros;
* solicitar informação faltante;
* classificar intenção;
* direcionar para fila;
* encaminhar para departamento;
* aplicar SLA;
* criar handoff humano.

Automação por regra não pode:

* fechar venda;
* reservar produto;
* confirmar estoque definitivo;
* garantir aplicação;
* enviar PIX;
* enviar pagamento sem regra autorizada;
* confirmar agendamento;
* alterar sistema externo;
* dar baixa;
* criar pedido sem aprovação;
* prometer prazo não confirmado.

---

## 11. Catálogo e consulta de preços

Consulta de preço é um dos principais recursos comerciais do Shamar Connect.

Fluxo esperado:

```text
Cliente pergunta
→ sistema identifica produto
→ consulta catálogo
→ responde preço seguro
→ informa disponibilidade da última atualização
→ humano assume quando houver intenção de compra
```

O sistema nunca deve inventar produto, preço ou estoque.

Se a confiança for baixa:

* pedir código;
* pedir foto;
* pedir modelo;
* pedir ano;
* pedir detalhes;
* direcionar humano.

Casos de referência:

### Lips

* autopeças;
* catálogo CPlus;
* preço;
* estoque;
* veículo;
* aplicação;
* balcão;
* oficina;
* supervisor.

### Hall

* panificação;
* confeitaria;
* produtos;
* kits;
* encomendas;
* retirada;
* entrega;
* atendimento humano.

Esses casos devem provar que o motor é configurável e reutilizável.

---

## 12. Linha do tempo única do relacionamento

Uma pessoa pode interagir por vários canais.

O sistema deve evoluir para uma linha do tempo única com:

* WhatsApp;
* Instagram;
* Facebook;
* TikTok;
* e-mail;
* formulários;
* pedidos;
* pagamentos;
* orçamentos;
* notas internas;
* arquivos;
* áudios;
* eventos;
* histórico;
* sugestões assistidas por IA.

O canal é parte do histórico, não a identidade total da pessoa.

O objetivo é permitir que o atendente compreenda o relacionamento completo sem procurar em vários sistemas.

---

## 13. Assistente de Atendimento

ChatGPT/OpenAI será integrado como camada assistiva.

A IA não nasce como dona do atendimento.

O atendente continua responsável.

Modos previstos:

```ts
type AiMode =
  | "off"
  | "suggestion_only"
  | "supervised"
  | "auto_reply_limited";
```

Padrão inicial:

```text
off
```

Primeira evolução:

```text
suggestion_only
```

A IA poderá:

* resumir conversa;
* sugerir resposta;
* classificar intenção;
* identificar urgência;
* sugerir departamento;
* sugerir tags;
* sugerir próximo passo;
* detectar oportunidade;
* recomendar follow-up;
* localizar informação;
* resumir atendimentos do dia;
* gerar briefing operacional.

A IA não poderá, sem regra e autorização:

* fechar venda;
* reservar;
* enviar PIX;
* confirmar pagamento;
* confirmar agendamento;
* alterar cadastro crítico;
* prometer prazo;
* agir fora das permissões da organização.

---

## 14. Copiloto de operações

A visão de longo prazo não é apenas uma IA para responder mensagens.

A visão é um copiloto operacional.

Exemplo de resumo futuro:

```text
Bom dia, Allan.

Hoje existem:

- 38 novas mensagens;
- 4 pessoas aguardando há mais de 20 minutos;
- 1 canal com falha;
- 3 oportunidades de follow-up;
- 2 pagamentos aguardando;
- aumento de demanda no Viciados em Trilhas;
- queda de atendimento na MK Shalom.
```

O copiloto deve transformar dados em prioridade.

A maioria dos sistemas mostra números.

O ecossistema Moriah deve mostrar:

* o que aconteceu;
* o que importa;
* o que precisa de atenção;
* o que pode virar oportunidade;
* qual é o próximo passo recomendado.

---

## 15. Produtos da Shamar Suite

### Shamar Connect

Comunicação, atendimento, relacionamento, canais, automação e interação.

### Shamar ERP

Financeiro, fiscal, administrativo, operacional e gerencial.

### Shamar Church

Gestão eclesiástica integrada aos demais produtos.

### Shamar Kids

Gestão infantil, comunicação com responsáveis, segurança e operação.

### Shamar Events

Eventos, inscrições, comunicação, participantes e operação.

### OriahFin

Produto financeiro e de gestão integrado ao ecossistema.

Cada produto deve respeitar sua responsabilidade.

Não duplicar regras de negócio que pertencem a outro produto.

---

## 16. Princípios de experiência

Todos os produtos devem:

* parecer premium;
* ser simples para leigos;
* ser eficientes para profissionais;
* ter hierarquia visual clara;
* funcionar em desktop e mobile;
* evitar telas quebradas;
* evitar botões mortos;
* evitar placeholders permanentes;
* evitar linguagem técnica desnecessária;
* apresentar erros de forma amigável;
* mostrar estados vazios úteis;
* preservar contexto;
* reduzir suporte necessário.

Não usar aparência de beta como desculpa para má execução.

---

## 17. Princípios técnicos

A arquitetura deve priorizar:

* multi-tenant;
* isolamento de dados;
* permissões;
* auditoria;
* adapters/providers;
* idempotência;
* webhooks seguros;
* retries;
* observabilidade;
* logs sem segredos;
* feature flags;
* LGPD;
* escalabilidade progressiva;
* componentes reutilizáveis;
* domínio separado por responsabilidade.

Nunca:

* commitar secrets;
* expor service role;
* logar tokens;
* hardcodar cliente como regra global;
* misturar Centro de Comando com Admin SaaS;
* misturar produto com cliente;
* depender de um único provider;
* usar produção como ambiente de teste.

---

## 18. Princípios comerciais

Primeiro usar internamente.

Depois validar.

Depois vender.

Fluxo:

```text
uso interno
→ validação real
→ repetibilidade
→ documentação
→ demonstração
→ comercialização
```

Nenhum recurso deve ser vendido antes de funcionar de forma previsível.

O produto deve possuir:

* implantação repetível;
* checklist;
* documentação;
* demonstração;
* suporte;
* segurança;
* clareza de escopo.

Casos iniciais:

* Lips — autopeças;
* Hall — panificação;
* NutriFlow — demonstração;
* Centro de Comando — uso interno Allan/Moriah.

---

## 19. Meta / WhatsApp Oficial

A Moriah pretende operar com WhatsApp Business Platform oficial.

Objetivos:

* usar WhatsApp Oficial;
* preparar Shamar Kids;
* verificar empresa e domínio;
* criar app Meta;
* operar webhooks;
* usar templates;
* manter opt-in;
* atender LGPD;
* preparar candidatura futura à parceria Meta.

Não afirmar parceria antes de aprovação oficial.

---

## 20. O que nunca fazer

Nunca:

* perder a origem de uma conversa;
* misturar dados de tenants;
* inventar preço;
* inventar estoque;
* vender automaticamente sem autorização;
* criar reserva falsa;
* confirmar pagamento inexistente;
* prometer aplicação de produto;
* prometer agendamento;
* ocultar que uma resposta é automática quando relevante;
* fingir que uma integração planejada já está ativa;
* mostrar dados demo como produção;
* tratar cliente externo como empresa do Allan;
* transformar o Centro de Comando em Admin Shamar Connect;
* criar funcionalidades sem valor operacional claro.

---

## 21. Critério de prioridade

Toda nova funcionalidade deve responder:

1. Resolve um problema real?
2. Aumenta valor percebido?
3. Reduz trabalho manual?
4. Melhora segurança?
5. Melhora clareza?
6. É reutilizável?
7. É necessária agora?
8. Pode quebrar algo que já funciona?
9. Pertence a este produto?
10. Está alinhada com esta visão?

Se não estiver alinhada, vai para o backlog.

---

## 22. Visão final

A Moriah Systems não está construindo apenas sites, aplicativos, CRMs ou chatbots.

Está construindo um ecossistema operacional integrado.

O objetivo final é permitir que Allan e futuros usuários entendam e operem suas empresas por meio de uma visão clara, confiável e assistida.

O Centro de Comando mostra o que está acontecendo.

O Shamar Connect organiza as interações.

O Shamar ERP registra a operação.

Os produtos especializados executam seus domínios.

A inteligência assistiva conecta contexto, prioridade e decisão.

Visão resumida:

> Um sistema operacional para empresas, pessoas e operações, onde comunicação, gestão e inteligência trabalham juntas.
