# Centro de Comando Moriah

## Objetivo

O Centro de Comando é o cockpit operacional do Allan/Moriah para acompanhar marcas, empresas, produtos, clientes, canais de comunicação, caixas de entrada, atendimentos, automações, status dos canais, integrações futuras e IA assistiva futura.

O Shamar Connect será a central de comunicação e interação da Moriah Systems.

Referência conceitual: ManyChat + central de atendimento mais robusta, com identidade própria.

Shamar Connect = comunicação, interação, atendimento, automação, fila e relacionamento.

Rota principal:

```text
/operations
```

`/admin/command-center` redireciona para `/operations`.

## Classificação correta

- Moriah Systems: dona da plataforma e operação principal.
- Shamar: suíte/produtos da Moriah.
- Shamar Connect: produto SaaS e motor de comunicação/interação.
- Lips: cliente do Shamar Connect.
- OriahFin: produto.
- MK Shalom: operação própria/agência.
- Viciados em Trilhas: operação própria.
- Pessoal Allan: operação pessoal/admin.

## Seções

- Topo executivo.
- Caixas de entrada.
- Empresas e operações próprias.
- Produtos Moriah/Shamar.
- Clientes Shamar Connect.
- Lips Live.
- Canais e integrações.
- WhatsApp Oficial / Meta Partner readiness.

## Canais preparados visualmente

- WhatsApp Conectado.
- WhatsApp Oficial Meta.
- Instagram.
- Facebook.
- TikTok.
- E-mail futuro.
- Site/formulário futuro.
- Chat futuro.
- Assistente de Atendimento futuro.

## IA futura

A IA será módulo adicional e assistivo, não produto base.

Nome visual: Assistente de Atendimento.

Funções futuras:

- sugerir resposta;
- resumir conversa;
- identificar intenção;
- classificar lead;
- indicar urgência;
- recomendar próximo passo;
- preencher dados;
- ajudar atendente humano.

A IA deve atuar como copiloto, não como dona do atendimento.

## Regras

- Cliente comum não acessa.
- Acesso restrito a tenant plataforma com papel owner/admin.
- Dados reais da Lips são buscados server-side.
- Service role nunca é exposta ao client.
- A Lips nunca deve aparecer como empresa da Moriah.
- WhatsApp Conectado e WhatsApp Oficial devem permanecer separados.
- Não vender Shamar Connect como IA agora.
- Não comunicar parceria Meta antes de aprovação real.

## Próximos passos seguros

- Validar a rota em produção.
- Testar mensagens reais da Lips pelo WhatsApp.
- Acompanhar inbound, outbound, jobs e cooldown pelo painel.
- Avançar readiness Meta apenas como preparação, sem integração final agora.
