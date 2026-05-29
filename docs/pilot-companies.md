# Plano comercial multiempresa do ShamarConnect

Este documento registra a lista de empresas que serão liberadas para teste comercial do ShamarConnect e os recursos necessários para atender esse cenário sem comprometer a estabilidade da plataforma.

## Decisão estratégica atualizada

As empresas listadas não são apenas um piloto pequeno. Elas fazem parte da estratégia para pagar a estrutura do ShamarConnect e validar o produto em operação real.

Portanto, a liberação deve acontecer com quase todas as empresas de uma vez, mas com escopo mínimo controlado.

A regra principal é:

```txt
liberar comercialmente sem quebrar o núcleo do ShamarConnect
```

## Prioridade absoluta

A prioridade máxima do projeto é manter o ShamarConnect funcionando.

Antes de qualquer expansão, o sistema precisa continuar estável em:

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

## Modelo de liberação comercial controlada

Como as empresas ajudam a pagar a estrutura, o caminho não será esperar meses por uma arquitetura perfeita.

O caminho será:

1. liberar quase todas as empresas com funções mínimas;
2. separar dados por empresa o mais rápido possível;
3. evitar disparos em massa no começo;
4. trabalhar com atendimento individual e fluxos manuais;
5. criar respostas rápidas por segmento e idioma;
6. monitorar erros pelo Teste do Sistema;
7. evoluir o multiempresa sem travar a operação comercial.

## Empresas liberadas para teste comercial

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

Recursos mínimos necessários:

- atendimento por idioma;
- fluxos de venda de passeio;
- respostas rápidas de dúvidas frequentes;
- tags por idioma e interesse.

### 2. OriahFin

Tipo: empresa própria de software financeiro.

Uso previsto:

- suporte ao produto;
- venda do software;
- atendimento de leads;
- fluxos de onboarding e suporte.

Recursos mínimos necessários:

- fluxo de suporte;
- fluxo comercial;
- respostas rápidas sobre produto;
- classificação de leads e clientes.

### 3. ShamarConnect

Tipo: produto próprio.

Uso previsto:

- venda do ShamarConnect;
- suporte aos usuários;
- demonstrações;
- atendimento interno e externo.

Recursos mínimos necessários:

- fluxo de demonstração;
- fluxo de suporte;
- respostas rápidas sobre planos e funcionalidades;
- registro de dúvidas recorrentes.

### 4. Shalom MK Solutions

Tipo: agência de marketing.

Uso previsto:

- venda de soluções de marketing;
- atendimento comercial;
- qualificação de leads;
- fluxos por serviço.

Recursos mínimos necessários:

- fluxo de briefing inicial;
- fluxo de orçamento;
- respostas rápidas por serviço;
- tags por interesse: site, tráfego, social media, identidade visual, automação.

### 5. Espaço da Roça Restaurante e Pizzaria

Tipo: restaurante e pizzaria.

Uso previsto:

- atendimento de clientes;
- pedidos;
- dúvidas sobre cardápio;
- promoções;
- relacionamento local.

Recursos mínimos necessários:

- respostas rápidas de cardápio;
- fluxo de pedido;
- fluxo de horário/localização;
- tags de cliente recorrente e pedido.

### 6. Espaço da Roça Empório

Tipo: loja de produtos de empório.

Uso previsto:

- venda de produtos;
- catálogo;
- atendimento de dúvidas;
- listas segmentadas.

Recursos mínimos necessários:

- respostas rápidas de produtos;
- fluxo de encomenda;
- tags por categoria de produto;
- catálogo simples por texto/link.

### 7. Auto Peças e Auto Center Lips

Tipo: autopeças e oficina.

Uso previsto:

- venda de peças e equipamentos;
- atendimento de oficina;
- orçamento;
- agendamento;
- pós-venda.

Recursos mínimos necessários:

- fluxo de orçamento;
- fluxo de agendamento;
- respostas rápidas para peça, veículo e serviço;
- campos/tags para placa, modelo, peça e serviço.

### 8. Hall Donous

Tipo: venda de donuts e produtos de panificação.

Uso previsto:

- vendas por WhatsApp;
- encomendas;
- atendimento de eventos;
- promoções e relacionamento.

Recursos mínimos necessários:

- fluxo de encomenda;
- respostas rápidas de sabores, valores e entrega;
- tags por evento, encomenda e cliente recorrente.

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

Recursos mínimos necessários:

- fluxos por passeio;
- respostas rápidas em 3 idiomas;
- tags por evento;
- pré-venda e pós-venda.

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

Recursos mínimos necessários:

- fluxos por passeio;
- respostas rápidas em 3 idiomas;
- confirmação de presença;
- envio de informações pré-evento.

### 11. RSantos Instalações Elétricas

Tipo: empresa elétrica.

Público: médio e grande porte.

Uso previsto:

- atendimento comercial;
- triagem de demanda;
- orçamento;
- manutenção;
- relacionamento com empresas.

Recursos mínimos necessários:

- fluxo de triagem técnica;
- respostas rápidas para orçamento e visita;
- campos/tags para tipo de instalação, urgência e porte do cliente.

### 12. Joyce Corretora

Tipo: corretora de seguros e planos de saúde.

Uso previsto:

- captação de leads;
- qualificação;
- cotação;
- acompanhamento de proposta;
- suporte a clientes.

Recursos mínimos necessários:

- fluxo de cotação;
- respostas rápidas por tipo de seguro/plano;
- tags para saúde, vida, auto, empresarial e proposta.

### 13. Empresa de Energia Solar

Tipo: energia solar.

Uso previsto:

- captação de leads;
- simulação inicial;
- qualificação do imóvel/conta;
- agendamento de visita;
- follow-up comercial.

Recursos mínimos necessários:

- fluxo de qualificação;
- respostas rápidas sobre economia e orçamento;
- campos/tags para valor da conta, tipo de imóvel e cidade.

### 14. Empresa de Instalação e Manutenção de CFTV

Tipo: segurança eletrônica/CFTV.

Uso previsto:

- atendimento comercial;
- suporte técnico;
- orçamento;
- agendamento;
- manutenção preventiva.

Recursos mínimos necessários:

- fluxo de orçamento técnico;
- fluxo de suporte;
- respostas rápidas para instalação, manutenção e visita;
- tags para câmera, DVR/NVR, rede, manutenção e instalação.

### 15. Escritório de Contabilidade

Tipo: escritório de contabilidade.

Uso previsto:

- atendimento de clientes;
- triagem de demandas;
- abertura/regularização de empresa;
- MEI;
- obrigações fiscais;
- suporte administrativo.

Recursos mínimos necessários:

- fluxo de triagem contábil;
- respostas rápidas para MEI, abertura, regularização e impostos;
- tags por demanda e urgência.

## Escopo mínimo para liberar quase todas de uma vez

Para liberar comercialmente sem travar o projeto, cada empresa precisa ter pelo menos:

1. cadastro da empresa;
2. segmento definido;
3. idioma padrão;
4. idiomas atendidos;
5. tags básicas;
6. respostas rápidas iniciais;
7. 1 fluxo de atendimento inicial;
8. 1 fluxo comercial ou suporte;
9. contatos separados por empresa;
10. conversas separadas por empresa;
11. dashboard filtrável por empresa;
12. regra de consentimento desconhecido para contatos importados.

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

### 2. Operação em lote comercial

Precisamos cadastrar quase todas as empresas rapidamente.

Necessário criar:

- seed inicial de empresas;
- templates de respostas por segmento;
- templates de fluxos por segmento;
- tela simples de seleção de empresa;
- filtros obrigatórios por empresa.

### 3. Perfis e permissões

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

### 4. Identidade por empresa

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

### 5. Canais WhatsApp por empresa

Precisamos definir como cada empresa será conectada.

Opções:

- um número por empresa;
- número único para testes internos;
- múltiplas sessões no gateway;
- futura migração para API oficial da Meta.

Para liberar quase todas agora, o caminho mais seguro é:

```txt
começar com organização por empresa no CRM e usar poucos números conectados no começo
```

Depois evoluímos para múltiplas sessões/números por empresa.

### 6. Respostas rápidas por empresa e idioma

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

### 7. Fluxos por empresa e idioma

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

### 8. Catálogo ou base de produtos/serviços

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

### 9. Tags e segmentação

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

### 10. Funil por empresa

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

### 11. Importação com contexto de empresa

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

### 12. Relatórios por empresa

Indicadores mínimos:

- mensagens enviadas;
- mensagens recebidas;
- contatos importados;
- contatos aprovados/reprovados;
- respostas rápidas mais usadas;
- fluxos mais usados;
- atendimentos por status;
- vendas ou oportunidades, quando houver funil.

### 13. Segurança e governança

Regras importantes:

- manter consentimento separado de importação;
- não tratar contato importado como opt-in automático;
- registrar eventos de envio;
- registrar origem dos contatos;
- evitar disparo em massa neste primeiro ciclo;
- priorizar atendimento individual e teste controlado;
- manter logs por empresa.

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

## O que falta antes da liberação comercial ampla

Antes de liberar quase todas as empresas, precisamos implementar o mínimo de isolamento:

1. tabela de empresas;
2. seletor de empresa no sistema;
3. vínculo de contatos/conversas/respostas/fluxos com empresa;
4. idioma padrão por empresa;
5. respostas rápidas por empresa;
6. fluxos por empresa;
7. dashboard filtrável por empresa;
8. cuidado para não misturar dados entre empresas;
9. checklist de estabilidade do ShamarConnect;
10. setup SQL consolidado para quando o Supabase voltar a aceitar comandos.

## Estratégia de liberação atualizada

Como o objetivo é gerar caixa para pagar a estrutura, a liberação deve ser feita em lote comercial controlado.

### Lote comercial 1: quase todas as empresas

Liberar com escopo mínimo:

- ShamarConnect;
- OriahFin;
- Shalom MK Solutions;
- Xperience Tour;
- Viciados em Trilhas;
- Kmon Adventure;
- Espaço da Roça Restaurante/Pizzaria;
- Espaço da Roça Empório;
- Hall Donous;
- Auto Peças e Auto Center Lips;
- RSantos Instalações Elétricas;
- Joyce Corretora;
- Energia Solar;
- CFTV;
- Escritório de Contabilidade.

### O que não liberar no início

Mesmo liberando quase todas as empresas, não liberar no primeiro ciclo:

- disparo em massa;
- automação sem revisão humana;
- múltiplos números sem teste;
- campanhas automáticas para contatos importados;
- respostas automáticas sem controle;
- integração OAuth antes da estabilidade.

## Próxima tarefa técnica recomendada

Criar a base multiempresa mínima:

- tabela `organizations`;
- tabela `organization_profiles`;
- campo `organization_id` nas tabelas principais;
- tela `/organizations`;
- seletor de empresa;
- seed inicial com as empresas deste documento;
- vínculo de respostas rápidas e fluxos por empresa.

Essa é a próxima evolução mais importante para permitir o lote comercial sem misturar dados.
