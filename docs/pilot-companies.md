# Plano de teste piloto multiempresa do ShamarConnect

Este documento registra a lista inicial de empresas que serão liberadas para teste do ShamarConnect e os recursos necessários para atender esse cenário sem comprometer a estabilidade da plataforma.

## Prioridade absoluta

A prioridade máxima do projeto é manter o ShamarConnect funcionando.

Antes de liberar novas funções, o sistema precisa continuar estável em:

- conexão com WhatsApp Web Gateway;
- leitura e envio de mensagens pela Central WhatsApp;
- CRM de contatos;
- importação de contatos;
- respostas rápidas;
- fluxos de conversa;
- dashboard operacional;
- teste do sistema;
- Supabase e Vercel funcionando sem quebrar telas existentes.

Nenhuma evolução deve colocar em risco o funcionamento básico do ShamarConnect.

## Empresas liberadas para teste piloto

### 1. Xperience Tour

Tipo: agência de turismo.

Idiomas principais:

- inglês;
- espanhol;
- português.

Uso previsto:

- venda de passeios/tickets;
- atendimento multilíngue;
- respostas rápidas por idioma;
- fluxos de qualificação turística.

### 2. OriahFin

Tipo: empresa própria de software financeiro.

Uso previsto:

- suporte ao produto;
- venda do software;
- atendimento de leads;
- fluxos de onboarding e suporte.

### 3. ShamarConnect

Tipo: produto próprio.

Uso previsto:

- venda do ShamarConnect;
- suporte aos usuários;
- demonstrações;
- atendimento interno e externo.

### 4. Shalom MK Solutions

Tipo: agência de marketing.

Uso previsto:

- venda de soluções de marketing;
- atendimento comercial;
- qualificação de leads;
- fluxos por serviço.

### 5. Espaço da Roça Restaurante e Pizzaria

Tipo: restaurante e pizzaria.

Uso previsto:

- atendimento de clientes;
- pedidos;
- dúvidas sobre cardápio;
- promoções;
- relacionamento local.

### 6. Espaço da Roça Empório

Tipo: loja de produtos de empório.

Uso previsto:

- venda de produtos;
- catálogo;
- atendimento de dúvidas;
- listas de transmissão segmentadas.

### 7. Auto Peças e Auto Center Lips

Tipo: autopeças e oficina.

Uso previsto:

- venda de peças e equipamentos;
- atendimento de oficina;
- orçamento;
- agendamento;
- pós-venda.

### 8. Hall Donous

Tipo: venda de donuts e produtos de panificação.

Uso previsto:

- vendas por WhatsApp;
- encomendas;
- atendimento de eventos;
- promoções e relacionamento.

### 9. Viciados em Trilhas

Tipo: agência de turismo de aventura.

Idiomas principais:

- português;
- inglês;
- espanhol.

Uso previsto:

- venda de tickets;
- atendimento de dúvidas;
- qualificação por evento;
- envio de informações pré-passeio;
- suporte pós-venda.

### 10. Kmon Adventure

Tipo: agência de turismo de aventura.

Idiomas principais:

- português;
- inglês;
- espanhol.

Uso previsto:

- venda de tickets;
- atendimento multilíngue;
- fluxos por passeio;
- confirmação de presença e informações pré-evento.

### 11. RSantos Instalações Elétricas

Tipo: empresa elétrica.

Público: médio e grande porte.

Uso previsto:

- atendimento comercial;
- triagem de demanda;
- orçamento;
- manutenção;
- relacionamento com empresas.

### 12. Joyce Corretora

Tipo: corretora de seguros e planos de saúde.

Uso previsto:

- captação de leads;
- qualificação;
- cotação;
- acompanhamento de proposta;
- suporte a clientes.

### 13. Empresa de Energia Solar

Tipo: energia solar.

Uso previsto:

- captação de leads;
- simulação inicial;
- qualificação do imóvel/conta;
- agendamento de visita;
- follow-up comercial.

### 14. Empresa de Instalação e Manutenção de CFTV

Tipo: segurança eletrônica/CFTV.

Uso previsto:

- atendimento comercial;
- suporte técnico;
- orçamento;
- agendamento;
- manutenção preventiva.

### 15. Escritório de Contabilidade

Tipo: escritório de contabilidade.

Uso previsto:

- atendimento de clientes;
- triagem de demandas;
- abertura/regularização de empresa;
- MEI;
- obrigações fiscais;
- suporte administrativo.

## Recursos que precisamos além do que temos hoje

### 1. Multiempresa / multi-tenant

O sistema precisa separar dados por empresa.

Necessário criar:

- tabela de empresas/organizações;
- vínculo de contatos com empresa;
- vínculo de conversas com empresa;
- vínculo de respostas rápidas com empresa;
- vínculo de fluxos com empresa;
- filtros por empresa no dashboard e nas telas operacionais.

Sem isso, as conversas e contatos de empresas diferentes podem se misturar.

### 2. Perfis e permissões

Precisamos preparar níveis de acesso.

Perfis mínimos:

- administrador geral;
- gestor da empresa;
- atendente;
- comercial;
- suporte.

Permissões necessárias:

- visualizar contatos;
- enviar mensagens;
- criar respostas rápidas;
- criar fluxos;
- importar contatos;
- exportar CSV;
- acessar configurações.

### 3. Identidade por empresa

Cada empresa precisa ter dados próprios.

Campos necessários:

- nome da empresa;
- segmento;
- idioma padrão;
- idiomas atendidos;
- telefone principal;
- site;
- descrição curta;
- tom de voz;
- horários de atendimento;
- mensagem de saudação;
- mensagem fora do horário;
- política comercial básica.

### 4. Canais WhatsApp por empresa

Precisamos definir como cada empresa será conectada.

Opções:

- um número por empresa;
- número único para testes internos;
- múltiplas sessões no gateway;
- futura migração para API oficial da Meta.

Para o teste inicial, o mais seguro é começar com poucas conexões reais e simular as demais com organização por empresa dentro do CRM.

### 5. Respostas rápidas por empresa e idioma

Cada empresa terá respostas próprias.

Campos necessários:

- empresa;
- idioma;
- categoria;
- título;
- mensagem;
- tags;
- status ativo/inativo.

Idiomas iniciais:

- pt-BR;
- en;
- es.

### 6. Fluxos por empresa e idioma

Fluxos devem ser separados por empresa.

Exemplos:

- atendimento inicial;
- qualificação;
- venda;
- orçamento;
- suporte;
- follow-up;
- pós-venda;
- recuperação de lead.

Para turismo, os fluxos precisam ter versões em português, inglês e espanhol.

### 7. Catálogo ou base de produtos/serviços

Para cada empresa, precisamos cadastrar produtos/serviços principais.

Exemplos:

- passeios e tickets;
- serviços de marketing;
- planos/seguros;
- serviços elétricos;
- produtos de empório;
- cardápio;
- peças e serviços automotivos;
- serviços de contabilidade.

Campos mínimos:

- nome;
- descrição;
- categoria;
- preço ou faixa de preço;
- idioma;
- link de venda/agendamento;
- disponibilidade;
- observações comerciais.

### 8. Tags e segmentação

Precisamos padronizar tags.

Exemplos:

- lead_novo;
- cliente;
- orçamento;
- suporte;
- turismo;
- restaurante;
- seguro;
- energia_solar;
- cftv;
- contabilidade;
- pt;
- en;
- es;
- quente;
- morno;
- frio.

### 9. Funil por empresa

Cada empresa pode ter funil próprio.

Funil mínimo:

- novo lead;
- em atendimento;
- qualificado;
- orçamento enviado;
- follow-up;
- venda fechada;
- perdido;
- suporte/pós-venda.

### 10. Importação com contexto de empresa

Importações precisam pedir:

- empresa de destino;
- origem da lista;
- idioma padrão;
- tag inicial;
- status de consentimento.

Isso vale para:

- WhatsApp/grupos;
- TXT;
- CSV;
- planilhas;
- Google exportado;
- Microsoft exportado.

### 11. Relatórios por empresa

Indicadores mínimos:

- mensagens enviadas;
- mensagens recebidas;
- contatos importados;
- contatos aprovados/reprovados;
- respostas rápidas mais usadas;
- fluxos mais usados;
- atendimentos por status;
- vendas ou oportunidades, quando houver funil.

### 12. Segurança e governança

Regras importantes:

- manter consentimento separado de importação;
- não tratar contato importado como opt-in automático;
- registrar eventos de envio;
- registrar origem dos contatos;
- evitar disparo em massa neste primeiro ciclo;
- priorizar atendimento individual e teste controlado.

## O que já temos hoje

O projeto já possui base para:

- conexão com WhatsApp Web;
- QR Code;
- Central WhatsApp;
- envio individual de mensagens;
- importação de contatos;
- importação de contatos de grupos;
- listas importadas;
- aprovação/reprovação;
- exportação CSV;
- respostas rápidas;
- fluxos de conversa manuais;
- dashboard operacional;
- teste do sistema;
- documentação.

## O que falta antes do piloto amplo

Antes de liberar todas as empresas de uma vez, precisamos implementar pelo menos:

1. tabela de empresas;
2. seletor de empresa no sistema;
3. vínculo de contatos/conversas/respostas/fluxos com empresa;
4. idioma padrão por empresa;
5. respostas rápidas por empresa;
6. fluxos por empresa;
7. ajustes no dashboard para filtrar por empresa;
8. cuidado para não misturar dados entre empresas;
9. checklist de estabilidade do ShamarConnect;
10. setup SQL consolidado para quando o Supabase voltar a aceitar comandos.

## Estratégia de liberação recomendada

Não liberar tudo sem separação multiempresa.

Liberação recomendada:

### Fase 1: piloto interno controlado

Empresas:

- ShamarConnect;
- OriahFin;
- Shalom MK Solutions.

Objetivo:

- validar suporte;
- validar venda;
- validar respostas rápidas;
- validar fluxos;
- validar dashboard.

### Fase 2: turismo multilíngue

Empresas:

- Viciados em Trilhas;
- Kmon Adventure;
- Xperience Tour.

Objetivo:

- validar atendimento em português, inglês e espanhol;
- validar venda de tickets;
- validar fluxos por passeio;
- validar pré e pós-venda.

### Fase 3: comércio e alimentação

Empresas:

- Espaço da Roça Restaurante/Pizzaria;
- Espaço da Roça Empório;
- Hall Donous;
- Auto Peças e Auto Center Lips.

Objetivo:

- validar pedidos;
- catálogo;
- orçamento;
- relacionamento;
- vendas recorrentes.

### Fase 4: serviços técnicos e profissionais

Empresas:

- RSantos Instalações Elétricas;
- Joyce Corretora;
- Energia Solar;
- CFTV;
- Escritório de Contabilidade.

Objetivo:

- validar triagem;
- qualificação;
- orçamento;
- suporte;
- acompanhamento de proposta.

## Próxima tarefa técnica recomendada

Criar a base multiempresa:

- tabela `organizations`;
- tabela `organization_profiles`;
- campo `organization_id` nas tabelas principais;
- tela `/organizations`;
- seletor de empresa;
- seed inicial com as empresas deste documento.

Essa é a próxima evolução mais importante antes de liberar o piloto para todas as empresas.
