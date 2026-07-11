# Internal Feature Release Policy

Data: 2026-07-11

Esta política separa liberação interna para Allan/Moriah de liberação comercial para clientes.

## Regra Central

```text
1. Liberação interna para Allan/Moriah
2. Liberação comercial para clientes
```

Não aplicar o mesmo critério aos dois ambientes.

## Liberação Interna — Centro de Comando

O Centro de Comando é o ambiente de uso real, testes e evolução da Moriah.

Funcionalidade interna pode entrar quando estiver:

```text
funcional
segura
isolada
observável
reversível
```

Ela pode continuar sendo melhorada depois do uso real. Não apresentar recurso interno como comercialmente pronto.

Recursos internos podem ser liberados progressivamente para WhatsApp, grupos, comunidades, múltiplas sessões, histórico, mídia, notas, atribuição, automações internas, relatórios, monitoramento, Instagram, Facebook, TikTok e IA assistiva.

Mesmo interno, manter aparência profissional, navegação organizada, estados vazios, tratamento de erro, logs acessíveis e opção de desligar feature.

Badges permitidos no Centro de Comando:

```text
Uso interno
Em validação interna
Aprovado internamente
```

Não usar "beta".

## Liberação Comercial — Clientes

Para clientes, o recurso só aparece depois que:

1. foi desenvolvido;
2. passou em testes automatizados;
3. foi testado no Centro de Comando ou ambiente controlado;
4. foi usado pelo Allan/Moriah;
5. recebeu aprovação explícita do Allan;
6. passou por segurança e isolamento de tenant;
7. passou por validação visual e mobile;
8. possui documentação;
9. possui tratamento de erros;
10. está pronto para suporte comercial.

Regra obrigatória:

```text
Não testado pelo Allan = não disponível ao cliente.
Não aprovado pelo Allan = não disponível ao cliente.
Não homologado = invisível ao cliente.
```

Não exibir para clientes:

- item desativado;
- card "em breve";
- canal incompleto;
- botão sem função;
- laboratório;
- feature experimental;
- configuração técnica futura.

Para clientes, recurso inexistente deve ser invisível.

## Estados Oficiais

```ts
type FeatureStage =
  | "hidden"
  | "internal_alpha"
  | "internal_active"
  | "internal_approved"
  | "commercial_pilot"
  | "commercial_active"
  | "disabled";
```

Significados:

| Estado | Significado |
| --- | --- |
| `hidden` | Código ou ideia ainda invisível. |
| `internal_alpha` | Disponível somente para Allan/Moriah em teste inicial. |
| `internal_active` | Usável no Centro de Comando. |
| `internal_approved` | Allan testou e aprovou para preparação comercial. |
| `commercial_pilot` | Liberado apenas para cliente piloto específico. |
| `commercial_active` | Disponível comercialmente. |
| `disabled` | Desativado por segurança, dependência ou decisão de produto. |

A decisão de acesso deve considerar:

```text
tenant
organization
role
environment
feature status
channel
approval
```

O acesso comercial nunca deve depender apenas de variável global.

## Feature Flags Separadas

Criar flags separadas para contexto interno:

```ts
whatsapp_groups_internal
whatsapp_communities_internal
social_channels_internal
ai_internal
```

Não reaproveitar a flag comercial do WhatsApp individual.

Exemplos de decisão:

| Contexto | Recurso | Estado |
| --- | --- | --- |
| Centro de Comando Moriah | Grupos WhatsApp | `internal_alpha` |
| Lips | Grupos WhatsApp | `disabled` |
| Hall | Grupos WhatsApp | `hidden` |

## Aprovação do Allan

Nenhum recurso muda de `internal_active` para `internal_approved`, `commercial_pilot` ou `commercial_active` sem aprovação explícita do Allan.

Registrar aprovação em documentação de release:

```text
recurso:
ambiente testado:
data:
resultado:
problemas encontrados:
correções:
aprovado por Allan:
liberação autorizada:
```

O Code não decide sozinho que uma funcionalidade está comercialmente pronta.

## Ordem Oficial — Lips

```text
1. WhatsApp
2. IA
3. Redes sociais
```

### Fase 1 — WhatsApp Lips

Concluir totalmente:

- inbound;
- outbound;
- inbox;
- contato;
- catálogo;
- classificador;
- cotação segura;
- cooldown;
- handoff;
- equipe;
- oficina;
- balcão;
- grupos ignorados no fluxo comercial atual;
- mídia preservada;
- autenticação de webhook;
- isolamento por organização;
- observabilidade;
- operação real.

### Fase 2 — IA Lips

IA entra como apoio supervisionado. Inicialmente pode resumir conversa, sugerir resposta, identificar intenção, identificar urgência, sugerir departamento, sugerir tags, sugerir próximo passo, buscar contexto de produto e ajudar o atendente.

IA não deve inicialmente fechar venda, confirmar estoque, reservar produto, enviar PIX, confirmar aplicação, negociar preço, responder autonomamente sem controle ou substituir regra determinística segura.

### Fase 3 — Redes Sociais Lips

Somente depois do WhatsApp e da IA estarem estáveis.

Cada canal deve passar pelo ciclo:

```text
integração
→ entrada
→ resposta
→ histórico
→ identidade do contato
→ fila
→ atribuição
→ automação
→ segurança
→ teste interno
→ aprovação
→ liberação
```

## Centro de Comando — Grupos e Comunidades

No Centro de Comando, grupos e comunidades podem ser desenvolvidos e liberados para uso interno por feature flag própria.

Grupos devem suportar progressivamente listagem, leitura, histórico, identificação, participantes, mensagens, mídia, busca, silenciar, etiquetas internas, observação, monitoramento e resposta manual autorizada.

Comunidades devem ser tratadas como estrutura separada de grupo. Mapear comunidade, grupos vinculados, grupo de avisos, participantes, administradores, mensagens, regras de envio, permissões e histórico.

No produto comercial atual, grupos continuam bloqueados no envio da Lips.

## Redes Sociais no Centro de Comando

Instagram, Facebook, TikTok e outros canais podem aparecer internamente assim que estiverem funcionalmente utilizáveis.

Critério interno:

- canal conecta;
- mensagens chegam;
- origem é identificada;
- resposta funciona quando permitida;
- histórico é preservado;
- erro é exibido;
- não mistura empresas;
- não expõe segredo;
- pode ser desligado rapidamente.

Não pode perder mensagens, misturar contas, responder pela empresa errada, expor tokens, criar risco para clientes ou parecer habilitado para tenants comerciais.

## Interface Comercial

Cliente comercial continua vendo somente recursos aprovados do seu escopo contratado, como dashboard WhatsApp, inbox, contatos, equipe, automações aprovadas, catálogo contratado, relatórios aprovados e configurações WhatsApp.

Não mostrar para clientes:

- grupos;
- comunidades;
- Instagram;
- Facebook;
- TikTok;
- IA;
- Centro de Comando;
- operações internas;
- recursos em teste;
- canais conectados da Moriah.

## Prioridades Imediatas

```text
1. Finalizar hardening e deploy do WhatsApp
2. Testar inbound real da Lips
3. Homologar fluxo WhatsApp da Lips
4. Corrigir todos os problemas encontrados
5. Liberar WhatsApp da Lips
6. Estruturar IA supervisionada para Lips
7. Testar IA internamente
8. Iniciar redes sociais da Lips
9. Evoluir Centro de Comando com grupos e comunidades
10. Integrar redes sociais ao Centro de Comando interno
```

O item 9 pode avançar paralelamente, desde que não atrase a homologação da Lips.

## Matriz Inicial

| Recurso | Lips | Hall | NutriFlow | Centro de Comando | Estágio | Aprovado pelo Allan | Próxima validação |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WhatsApp individual | `internal_approved` técnico; `commercial_pilot` após homologação real | `hidden` | `hidden` | `internal_active` | `internal_approved/commercial_pilot após homologação` | Pendente aprovação explícita pós-homologação | Teste inbound/outbound real Lips ponta a ponta |
| IA | `hidden/internal_alpha` | `hidden` | `hidden` | `internal_alpha` | `hidden/internal_alpha` | Não | Definir fluxo supervisionado e testar internamente |
| Redes sociais | `hidden` | `hidden` | `hidden` | `internal_alpha` | `hidden/internal_alpha` | Não | Validar conexão, entrada, resposta, histórico e isolamento |
| Grupos | `disabled` | `hidden` | `hidden` | `internal_alpha` | `internal_alpha` | Não | Implementar flag `whatsapp_groups_internal` e validação interna |
| Comunidades | `disabled` | `hidden` | `hidden` | `internal_alpha` | `internal_alpha` | Não | Modelar comunidade separada de grupo e validar internamente |
| Instagram | `hidden` | `hidden` | `hidden` | `internal_alpha` | `internal_alpha` | Não | Validar conexão, mensagens, resposta e isolamento |
| Facebook | `hidden` | `hidden` | `hidden` | `internal_alpha` | `internal_alpha` | Não | Validar conexão, mensagens, resposta e isolamento |
| TikTok | `hidden` | `hidden` | `hidden` | `internal_alpha` | `internal_alpha` | Não | Validar conexão, mensagens, resposta e isolamento |

## Regra Permanente

> A Moriah usa o Centro de Comando como ambiente real de validação dos recursos futuros. Funcionalidades podem ser liberadas internamente quando estiverem funcionais, seguras e isoladas. Clientes só recebem recursos após uso interno, homologação e aprovação explícita do Allan.

> Nenhum módulo comercial será apresentado como beta. Recursos ainda não aprovados permanecem invisíveis aos clientes.
