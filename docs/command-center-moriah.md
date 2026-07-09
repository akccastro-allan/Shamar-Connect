# Centro de Comando Moriah

## Objetivo

O Centro de Comando é a tela macro do Allan/Moriah para acompanhar empresas próprias, produtos, clientes e trilha de WhatsApp Oficial.

Rota principal:

```text
/admin/command-center
```

`/operations` redireciona para a rota principal.

## Classificação correta

- Moriah Systems: dona da plataforma e operação principal.
- Shamar: suíte/produtos da Moriah.
- Shamar Connect: produto SaaS de atendimento, CRM e WhatsApp.
- Lips: cliente do Shamar Connect.
- OriahFin: produto.
- MK Shalom: operação própria/agência.
- Viciados em Trilhas: operação própria.
- Pessoal Allan: operação pessoal/admin.

## Seções

- Topo executivo.
- Empresas e operações próprias.
- Produtos Moriah/Shamar.
- Clientes Shamar Connect.
- Lips Live.
- WhatsApp Oficial / Meta Partner readiness.

## Regras

- Cliente comum não acessa.
- Acesso restrito a tenant plataforma com papel owner/admin.
- Dados reais da Lips são buscados server-side.
- Service role nunca é exposta ao client.
- A Lips nunca deve aparecer como empresa da Moriah.
- WhatsApp Conectado e WhatsApp Oficial devem permanecer separados.

## Próximos passos seguros

- Validar a rota em produção.
- Testar mensagens reais da Lips pelo WhatsApp.
- Acompanhar inbound, outbound, jobs e cooldown pelo painel.
- Avançar readiness Meta apenas como preparação, sem integração final agora.
