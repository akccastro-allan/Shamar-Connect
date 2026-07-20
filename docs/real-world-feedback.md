# Real-World Feedback — ShamarConnect

Registro contínuo de problemas encontrados em uso real, melhorias de UX e performance.
Atualizado por Allan durante a Fase: Operação Real Assistida.

---

## Diretrizes desta fase

- Não iniciar módulos grandes nem novas integrações.
- Cada entrada aqui deve ter origem em uso real, não em hipótese.
- Correções são priorizadas antes de qualquer nova funcionalidade.
- O Attention Engine só avança quando os itens críticos e altos desta lista estiverem resolvidos.

---

## Estrutura de cada registro

```
### [EMPRESA] Título curto do problema
- **Problema:** descrição objetiva do que falhou ou incomodou
- **Impacto:** o que isso causou na operação
- **Empresa afetada:** Hall Donous / Lips / Shamar / Viciados / todas
- **Prioridade:** crítica / alta / média / baixa
- **Status:** aberto / em andamento / resolvido
- **Solução aplicada:** (preencher quando resolvido)
```

---

## Itens abertos

### [Lips] Mensagens recebidas não aparecem no sistema
- **Problema:** clientes entram em contato com o WhatsApp oficial da Lips, mas as mensagens não aparecem no inbox do Shamar Connect.
- **Impacto:** atendimento real fica invisível para a equipe, bloqueando o go-live operacional.
- **Empresa afetada:** Lips
- **Prioridade:** crítica
- **Status:** em andamento
- **Solução aplicada:** identificado mismatch entre o identificador real da sessão do gateway e `channels.session_id = 'lips-main'`. Canal Lips preparado com alias em `channels.external_instance`; patch em andamento para o webhook OpenWA resolver esse alias sem quebrar envio por `lips-main`.

---

## Itens resolvidos

*(Nenhum ainda.)*

---

## Notas de UX contínua

*(Observações menores que não chegam a ser bug mas afetam a experiência.)*

---

## Notas de performance

*(Lentidões, queries pesadas, carregamentos desnecessários identificados em uso.)*

---

## Preparação do Attention Engine

Pré-requisitos antes de iniciar:

- [ ] Pelo menos 2 semanas de uso real com Hall Donous e Lips operando
- [ ] Zero itens de prioridade crítica em aberto
- [ ] Zero itens de prioridade alta em aberto
- [ ] `docs/hall-lips-operation-checklist.md` validado em operação real
- [ ] Feedback de Allan sobre o Operations Center documentado aqui
