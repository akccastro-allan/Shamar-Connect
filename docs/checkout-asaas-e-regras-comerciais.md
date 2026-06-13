# Checkout Asaas e regras comerciais do ShamarConnect

Este documento define o padrão de checkout, cobrança, planos, reembolso e obrigações comerciais do ShamarConnect.

## 1. Objetivo

O checkout do ShamarConnect deve permitir contratação online dos planos Starter, Professional e Business, com pagamento processado pelo Asaas.

A integração deve respeitar:

- Código de Defesa do Consumidor, especialmente o direito de arrependimento em contratação online.
- LGPD, para tratamento de dados pessoais e financeiros.
- Marco Civil da Internet, quando aplicável ao uso da plataforma.
- Termos de uso dos provedores integrados, incluindo WhatsApp, Google, Asaas e serviços de infraestrutura.

## 2. Provedor de pagamento

Provedor padrão: Asaas.

Fluxo base:

1. Cliente escolhe um plano no site.
2. Sistema cria uma sessão de checkout interna.
3. Sistema cria ou reutiliza cliente no Asaas.
4. Sistema cria cobrança ou assinatura no Asaas.
5. Cliente é redirecionado para o link de pagamento.
6. Asaas envia webhook de confirmação.
7. ShamarConnect atualiza assinatura, fatura e pagamento.
8. O acesso é liberado conforme o plano contratado.

## 3. Dados enviados ao Asaas

Enviar apenas o necessário para cobrança:

- Nome ou razão social.
- CPF/CNPJ.
- E-mail.
- Telefone ou celular.
- Referência interna do cliente no ShamarConnect.
- Valor da cobrança.
- Descrição do plano contratado.
- Forma de cobrança.
- URL de retorno, quando aplicável.

Não enviar ao Asaas histórico de conversas, mensagens, contatos comerciais, mídias, dados de CRM ou dados de atendimento do cliente.

## 4. Padrão de cobrança

Formas aceitas:

- PIX.
- Boleto.
- Cartão de crédito.
- UNDEFINED quando for necessário permitir que o pagador escolha a forma de pagamento no ambiente Asaas.

Para cobrança avulsa de implantação, emitir cobrança separada.

Para recorrência mensal, usar assinatura ou cobrança recorrente conforme a implementação final no Asaas.

## 5. Planos oficiais

### Starter

Valor mensal: R$ 149,00.

Implantação sugerida: R$ 297,00.

Inclui:

- 1 empresa.
- 2 usuários.
- 1 conexão WhatsApp.
- Histórico permanente.
- Mensagens apagadas preservadas.
- Texto, imagem, áudio, vídeo, documento, sticker, localização e contato compartilhado.
- Respostas rápidas.
- Notas por contato.
- CRM básico.
- Exportação TXT.

Adicionais:

- Usuário extra: R$ 29,00/mês.
- WhatsApp extra: R$ 79,00/mês.
- Módulo IA: R$ 79,90/mês.

### Professional

Valor mensal: R$ 297,00.

Implantação sugerida: R$ 497,00.

Inclui:

- 1 empresa.
- 5 usuários.
- 1 conexão WhatsApp.
- Histórico permanente completo.
- Mídias no histórico.
- Mensagens apagadas preservadas.
- Kanban CRM completo.
- Respostas rápidas com variáveis.
- Assinatura do atendente.
- Notas e lembretes.
- Exportação TXT, HTML e CSV.
- Métricas básicas.
- Modo invisível/privacidade.

Adicionais:

- Usuário extra: R$ 39,00/mês.
- WhatsApp extra: R$ 97,00/mês.
- Módulo IA: R$ 79,90/mês.

### Business

Valor mensal: R$ 597,00.

Implantação sugerida: R$ 997,00.

Inclui:

- 1 empresa.
- 10 usuários.
- 2 conexões WhatsApp.
- Tudo do Professional.
- Métricas avançadas.
- Relatórios exportáveis.
- Múltiplos atendentes.
- Shamar Agent local.
- Integração com banco local.
- Suporte prioritário.
- Regras comerciais avançadas.

Adicionais:

- Usuário extra: R$ 49,00/mês.
- WhatsApp extra: R$ 127,00/mês.
- Módulo IA: R$ 79,90/mês.
- Integrações locais adicionais: sob orçamento.

## 6. Direito de arrependimento e devolução

Contratações feitas online por consumidor podem ser canceladas no prazo de 7 dias corridos, conforme o direito de arrependimento previsto no Código de Defesa do Consumidor.

Regra operacional:

- Se o cliente solicitar cancelamento dentro de 7 dias corridos da contratação online, deve ser analisada a devolução integral dos valores pagos pela mensalidade.
- Serviços de implantação, configuração personalizada, integrações locais, treinamentos, customizações ou serviços já executados podem ter tratamento específico, desde que a condição tenha sido informada de forma clara antes da contratação e respeite a legislação aplicável.
- Em contratos B2B personalizados, as condições de cancelamento, reembolso e prazo mínimo podem ser definidas em proposta comercial ou contrato específico.

## 7. Cancelamento após 7 dias

Após o prazo legal de arrependimento, o cliente pode solicitar cancelamento da renovação futura.

Regra sugerida:

- O acesso permanece ativo até o fim do ciclo pago.
- Não há reembolso proporcional automático, salvo obrigação legal, falha comprovada de prestação do serviço ou decisão comercial da Moriah Systems.
- Débitos em aberto permanecem exigíveis.

## 8. Inadimplência

Regras operacionais sugeridas:

- Fatura vencida por 1 a 5 dias: aviso no painel e e-mail.
- Fatura vencida por 6 a 10 dias: alerta de risco de suspensão.
- Fatura vencida por mais de 10 dias: suspensão parcial ou total do acesso, preservando dados conforme contrato e política de privacidade.
- Reativação após pagamento confirmado.

## 9. Preservação de dados após cancelamento

Após cancelamento ou suspensão, dados podem ser mantidos por prazo necessário para:

- Cumprimento de obrigação legal.
- Exercício regular de direitos.
- Auditoria, segurança e prevenção a fraudes.
- Solicitação de exportação pelo cliente, quando aplicável.

Prazos específicos devem constar na Política de Privacidade e em contrato quando necessário.

## 10. Webhooks Asaas

O ShamarConnect deve receber webhooks do Asaas para:

- Pagamento criado.
- Pagamento confirmado.
- Pagamento recebido.
- Pagamento vencido.
- Pagamento cancelado.
- Pagamento estornado.
- Assinatura criada.
- Assinatura cancelada.

Todo webhook deve ser salvo em tabela de eventos antes de processamento.

O processamento deve ser idempotente: receber o mesmo evento duas vezes não pode duplicar pagamento, fatura ou assinatura.

## 11. Variáveis de ambiente necessárias

- ASAAS_API_KEY.
- ASAAS_API_BASE_URL.
- ASAAS_WEBHOOK_TOKEN.
- APP_PUBLIC_URL.

Ambiente sandbox deve usar URL sandbox do Asaas.

Ambiente produção deve usar URL produção do Asaas.

## 12. Segurança

- Nunca expor ASAAS_API_KEY no navegador.
- Checkout deve ser criado por rota server-side.
- Webhook deve validar segredo/token.
- Dados financeiros não devem ser logados em texto aberto.
- Não armazenar dados completos de cartão no ShamarConnect.
- O cartão, quando usado, deve ser processado pelo Asaas.

## 13. Status internos recomendados

Checkout:

- pending.
- created.
- paid.
- expired.
- cancelled.
- failed.

Fatura:

- draft.
- open.
- overdue.
- paid.
- cancelled.
- refunded.

Pagamento:

- pending.
- confirmed.
- received.
- overdue.
- cancelled.
- refunded.
- failed.

## 14. Regra de liberação de acesso

Acesso ao sistema só deve ser liberado quando:

- pagamento inicial estiver confirmado, ou
- assinatura ativa estiver confirmada, ou
- houver liberação manual administrativa registrada.

Google OAuth não libera acesso por si só.

## 15. Checklist antes de produção

- Página de planos com recursos e limites claros.
- Termos de Uso detalhados.
- Política de Privacidade detalhada.
- Política de cancelamento e reembolso clara.
- Checkout em sandbox Asaas testado.
- Webhook Asaas testado.
- Criação/reutilização de cliente Asaas.
- Criação de cobrança/assinatura.
- Confirmação automática de pagamento.
- Suspensão por inadimplência.
- Liberação por pagamento confirmado.
