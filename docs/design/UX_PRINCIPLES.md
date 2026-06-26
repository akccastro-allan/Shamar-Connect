# Princípios de UX/UI — Shamar Connect

> **Tecnologia forte por dentro. Simples por fora.**

Diretriz **transversal e obrigatória**: toda tela nova ou alterada precisa ser amigável para o usuário comum. O cliente **não precisa entender** termos técnicos. A infraestrutura existe por dentro; a interface traduz para linguagem humana.

Aplicação **progressiva** ao longo dos Marcos 1–6 (não é redesign de tudo agora). Cada marco entrega um pedaço e relata na seção **"UX aplicada"**.

---

## 1. Os 10 requisitos de toda tela
1. **Ação principal evidente** — a tela responde "o que preciso fazer agora?".
2. **Linguagem simples** — sem jargão técnico visível.
3. **Visual limpo** — hierarquia clara, sem poluição.
4. **Estados vazios amigáveis** — explicam e convidam à ação (nunca tela em branco).
5. **Mensagens de erro compreensíveis** — orientam, não assustam.
6. **Status com cor/ícone** — verde/âmbar/vermelho + ícone, nunca só texto cru.
7. **Área técnica recolhida em "Avançado"** — detalhes existem, mas escondidos por padrão.
8. **Responsividade mobile** — funciona bem em ~380px.
9. **Zero exposição de segredo** — nunca mostrar token, payload, chave ou dado sensível.
10. **Zero obrigação de entender infraestrutura** — o cliente nunca precisa saber o que é "instância" ou "webhook".

## 2. Glossário de tradução (técnico → humano)
| Interno | Mostrar ao cliente |
|--------|--------------------|
| provider | **canal** |
| instance | **número conectado** |
| webhook | **conexão** |
| tenant | **empresa** |
| organization | **marca / unidade** |
| department | **setor** |
| outbox | **envio pendente** |
| failed | **falhou ao enviar** |
| unresolved_channel | **canal não reconhecido** |
| credentials | **dados de conexão** |
| channel_id / payload / token / Meta API / Evolution | *não aparecem* (só em "Avançado", quando fizer sentido) |

## 3. Telas operacionais (Central de Atendimento)
Mostrar sempre o que importa:
- **quem chamou** (nome do contato);
- **de onde veio** (canal: WhatsApp/Instagram/Facebook);
- **qual empresa / marca**;
- **qual canal** (número/conta);
- **quem está responsável** (atendente);
- **status** (com cor/ícone);
- **próximo passo** (responder, transferir, aguardar);
- **status da mensagem**: enviada → entregue → lida → ou **falhou ao enviar** (com opção de reenviar).

### Compositor da conversa
Destaque visual forte e permanente:

> **Respondendo como: [Empresa/Marca] — [Canal]**

Para o atendente nunca responder pela marca errada.

## 4. Configurações de canal (não pode parecer área de dev)
Mostrar **primeiro** o estado, não os campos técnicos:
- **WhatsApp** — conectado / desconectado;
- **Instagram** — conectado / desconectado;
- **Facebook** — conectado / desconectado;
- **última mensagem recebida** / **última mensagem enviada**;
- **status da conexão** (cor/ícone);
- botão **"Reconectar"**;
- botão **"Testar envio"**;
- botão **"Ver detalhes técnicos"** → só dentro de uma área **Avançado** recolhida.

As configurações devem parecer um **assistente guiado**, com textos claros e passos objetivos.

## 5. Tom e marca
O Shamar deve transmitir **confiança, organização e facilidade**. Bonito e moderno, usando o design system (Navy `#1B2F5B`, Teal `#2ABFAB`, Gold `#C9952A`, cantos `rounded-[2rem]`, títulos `font-black`).

---

## 6. Onde aplicar (foco por marco)
- **Central de Atendimento** (Marcos 1–4)
- **Configurações de canais** + **status de conexão** (Marcos 1–2)
- **Envio e falha de mensagens** (Marco 1, PR3)
- **Shamar Kids** (Marco 5)
- **Shamar Events** (Marco 5)
- **Shamar Agent** (Marco 6)
- **Painel do cliente** (transversal)

## 7. Seção "UX aplicada" no relatório de cada marco
Ao finalizar cada marco, relatar:
- telas ajustadas;
- termos técnicos substituídos;
- estados vazios criados;
- mensagens de erro melhoradas;
- pontos que ainda ficaram técnicos (dívida de UX).
