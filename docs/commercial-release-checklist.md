# Checklist de Release Comercial

## Produto

- [ ] Login funciona.
- [ ] Reset de senha funciona.
- [ ] Isolamento de tenant validado.
- [ ] Navegação do cliente mostra apenas recursos WhatsApp.
- [ ] Inbox abre sem erro.
- [ ] Inbound real funciona.
- [ ] Outbound real funciona.
- [ ] Histórico preservado.
- [ ] Equipe e departamentos funcionam.
- [ ] Automação por regra funciona.
- [ ] Catálogo funciona quando contratado.
- [ ] Handoff humano funciona.
- [ ] Erros são amigáveis.
- [ ] Mobile aceitável.
- [ ] Suporte visível ao cliente.

## Segurança

- [ ] `/operations` invisível e inacessível para cliente.
- [ ] `/admin` invisível e inacessível para cliente.
- [ ] Meta readiness invisível para cliente.
- [ ] Instagram, Facebook, TikTok, e-mail, IA e omnichannel invisíveis para cliente.
- [ ] Nenhum segredo aparece em tela ou log.
- [ ] Logs globais não aparecem para cliente.
- [ ] Feature flags revisadas.

## Operação

- [ ] Implantação documentada.
- [ ] Cliente tem canal WhatsApp correto.
- [ ] Provider e sessão conferidos.
- [ ] Webhook configurado.
- [ ] Status do gateway conferido.
- [ ] Testes de duplicação e cooldown feitos.
- [ ] Grupos ignorados.
- [ ] `fromMe` ignorado.
- [ ] Mídia encaminhada para humano.

## Demonstração

- [ ] NutriFlow Demo não usa dados reais.
- [ ] Demo não mostra Centro de Comando.
- [ ] Demo não mostra roadmap interno.
- [ ] Demo mostra inbox, triagem, handoff, histórico, notas, equipe e relatório básico.
