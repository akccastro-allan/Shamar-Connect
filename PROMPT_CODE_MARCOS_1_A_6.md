# Prompt para o Code — Marcos 1 a 6 do Shamar Connect

Use este prompt somente depois do Marco 0 aprovado.

## North Star

> Nenhuma mensagem perdida, nenhuma empresa misturada, nenhuma resposta pela marca errada e nenhuma pessoa presa no robô.

---

# Marco 1 — Roteamento obrigatório por canal

## Entregas

- `channel_id` obrigatório em novas conversas e mensagens;
- aliases de providers antigos;
- `contact_identities`;
- unicidade por canal:
  - conversa;
  - mensagem;
  - identidade;
- `provider_events` idempotente;
- `message_outbox` ou fluxo equivalente;
- `sendMessageByChannel`;
- `resolveChannelFromWebhook`;
- providers:
  - evolution;
  - meta_whatsapp;
  - meta_instagram;
  - meta_messenger;
  - whatsapp_web_legacy.

## Proibições

- não usar instância global;
- não usar tenant/org de env para webhook;
- não buscar primeiro canal;
- não aceitar envio sem canal.

## Aceite

- dois canais Evolution funcionam;
- um canal Meta funciona;
- envio sem canal falha;
- webhook duplicado não duplica mensagem.

---

# Marco 2 — Central omnichannel

## Entregas

- WhatsApp, Instagram e Messenger em uma Central;
- contas sociais ligadas a `channel_id`;
- IDs sociais em `contact_identities`, nunca em `crm_contacts.phone`;
- compositor com “Respondendo como”;
- filtros por empresa, canal, setor e responsável;
- paginação.

## Aceite

- Instagram responde pela conta correta;
- Messenger responde pela Página correta;
- WhatsApp responde pelo número correto.

---

# Marco 3 — Equipe, setores e concorrência

## Entregas

- papel `supervisor`;
- `department_members`;
- atendente em múltiplos setores;
- assumir conversa de forma atômica;
- transferência;
- notas internas;
- auditoria.

## Aceite

- dois usuários não assumem a mesma conversa simultaneamente;
- supervisor vê tudo;
- atendente vê apenas seu escopo.

---

# Marco 4 — Human-first / Clínica

## Entregas

- modos:
  - off;
  - assist;
  - triage;
  - autonomous_restricted.
- automação clínica sem loop;
- pedido de humano transfere;
- uma tentativa de esclarecer;
- falha transfere;
- fixture de demonstração com seis atendentes e 150 conversas fictícias.

## Aceite

- ninguém fica preso no robô;
- automação não encerra;
- automação não dá orientação clínica.

---

# Marco 5 — Shamar Notifications / Kids / Events

## Entregas

- núcleo de notificações por template;
- Meta Cloud API;
- templates Kids:
  - chamar responsável;
  - chamar líder;
  - chamar voluntário;
  - chamada genérica.
- templates Events:
  - lembrar evento;
  - confirmar inscrição;
  - avisar alteração.
- auditoria;
- status enviado/entregue/lido/falhou;
- envio imediato;
- envio agendado simples.

## Regras Kids

- não informar motivo ao responsável;
- motivo apenas como nota interna restrita;
- não conversar com criança;
- sem fotos no MVP.

## Aceite

- template enviado pela API oficial;
- status recebido no webhook;
- auditoria registrada;
- envio sai pelo canal correto.

---

# Marco 6 — Shamar Agent / Datashow seguro

## Entregas

- canal interno `shamar_agent`;
- registro de dispositivo;
- status online/offline;
- popup seguro;
- confirmação de recebimento;
- fallback para WhatsApp interno;
- modo projeção seguro.

## Regra

No PC de datashow/projeção, popup não pode mostrar:

- nome completo;
- telefone;
- motivo;
- observação;
- dado sensível.

## Aceite

- popup aparece sem dados sensíveis;
- confirmação é registrada;
- se não confirmar, escalona;
- painel restrito mostra detalhes somente para autorizado.

---

# Relatório obrigatório após cada marco

Responder ao Allan em PT-BR:

```text
O que foi alterado
Migrations criadas/aplicadas
Arquivos principais
Testes executados
Riscos restantes
Como validar manualmente
Commit
Próximo marco recomendado
```
