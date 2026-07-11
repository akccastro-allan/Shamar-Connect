# Playbook de Implantação de Cliente WhatsApp

Use este checklist para cada novo cliente do Shamar Connect WhatsApp.

## Escopo

- Produto vendido: Shamar Connect - Atendimento por WhatsApp.
- Recursos visíveis: dashboard, atendimentos, contatos, equipe, automações por regra, catálogo contratado, relatórios básicos e configurações do WhatsApp.
- Recursos internos: Centro de Comando, Admin plataforma, implantação, logs globais, Meta readiness, IA e canais futuros.

## Checklist Copiável

- [ ] 1. Criar tenant.
- [ ] 2. Criar organização.
- [ ] 3. Criar owner inicial.
- [ ] 4. Definir plano contratado.
- [ ] 5. Definir features em `tenants.metadata.features`.
- [ ] 6. Criar canal WhatsApp.
- [ ] 7. Configurar provider.
- [ ] 8. Configurar sessão.
- [ ] 9. Configurar webhook.
- [ ] 10. Criar equipe.
- [ ] 11. Criar departamentos.
- [ ] 12. Configurar automações por regra.
- [ ] 13. Configurar catálogo, se contratado.
- [ ] 14. Configurar handoff humano.
- [ ] 15. Testar inbound.
- [ ] 16. Testar outbound.
- [ ] 17. Testar automações.
- [ ] 18. Testar permissões por role.
- [ ] 19. Liberar produção.
- [ ] 20. Registrar aceite do cliente.

## Teste Inbound Mínimo

- Enviar mensagem externa real para o número de teste.
- Confirmar `provider_events` criado.
- Confirmar `whatsapp_messages` inbound.
- Confirmar conversa no tenant/organização corretos.
- Confirmar job de automação quando aplicável.
- Confirmar outbound salvo quando resposta automática for segura.
- Confirmar que grupos, `fromMe` e mídia não geram resposta automática.

## Liberação

- Cliente comum não acessa `/operations` nem `/admin`.
- Menu do cliente não mostra recursos futuros.
- Typecheck e build passam antes do go-live.
- Número real só é ativado após aceite do teste ponta a ponta.
