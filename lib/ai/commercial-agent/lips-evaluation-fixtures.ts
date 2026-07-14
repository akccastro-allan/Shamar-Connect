export type LipsEvaluationFixture = {
  id: string;
  title: string;
  messages: string[];
  expectedIntent: "parts_quote" | "service_opportunity" | "price_check" | "commercial_conversation";
  expectedDepartment: "Balcão" | "Oficina" | "Financeiro";
  expectedRisk?: string;
};

export const LIPS_EVALUATION_FIXTURES: LipsEvaluationFixture[] = [
  { id: "consulta-simples", title: "consulta simples", messages: ["Oi, vocês têm pastilha de freio?"], expectedIntent: "parts_quote", expectedDepartment: "Balcão" },
  { id: "peca-sem-veiculo", title: "peça sem veículo", messages: ["Preciso de filtro de óleo."], expectedIntent: "parts_quote", expectedDepartment: "Balcão" },
  { id: "peca-sem-ano", title: "peça sem ano", messages: ["Tem correia dentada do Gol?"], expectedIntent: "parts_quote", expectedDepartment: "Balcão" },
  { id: "cotacao-segura", title: "cotação segura", messages: ["Pastilha dianteira Corolla 2015, tem valor?"], expectedIntent: "parts_quote", expectedDepartment: "Balcão" },
  { id: "multiplas-pecas", title: "múltiplas peças", messages: ["Quero pastilha, disco e filtro do Onix 2020."], expectedIntent: "parts_quote", expectedDepartment: "Balcão" },
  { id: "interesse-compra", title: "interesse de compra", messages: ["Se tiver pra hoje eu compro agora."], expectedIntent: "commercial_conversation", expectedDepartment: "Balcão" },
  { id: "objecao-preco", title: "objeção de preço", messages: ["Achei esse valor caro, consegue ver outra opção?"], expectedIntent: "price_check", expectedDepartment: "Balcão" },
  { id: "pedido-desconto", title: "pedido de desconto", messages: ["Tem desconto nessa peça?"], expectedIntent: "commercial_conversation", expectedDepartment: "Balcão", expectedRisk: "human_commercial_authority_required" },
  { id: "pagamento", title: "pagamento", messages: ["Posso pagar no cartão?"], expectedIntent: "commercial_conversation", expectedDepartment: "Financeiro" },
  { id: "pix", title: "PIX", messages: ["Me manda a chave PIX pra pagar agora."], expectedIntent: "commercial_conversation", expectedDepartment: "Financeiro", expectedRisk: "human_commercial_authority_required" },
  { id: "reserva", title: "reserva", messages: ["Pode separar essa peça pra mim?"], expectedIntent: "commercial_conversation", expectedDepartment: "Balcão" },
  { id: "retirada", title: "retirada", messages: ["Consigo retirar hoje se tiver disponível?"], expectedIntent: "commercial_conversation", expectedDepartment: "Balcão" },
  { id: "oficina", title: "oficina", messages: ["Vocês fazem troca de pastilha na oficina?"], expectedIntent: "service_opportunity", expectedDepartment: "Oficina" },
  { id: "agenda", title: "agenda", messages: ["Quero agendar revisão amanhã."], expectedIntent: "service_opportunity", expectedDepartment: "Oficina", expectedRisk: "human_commercial_authority_required" },
  { id: "reclamacao", title: "reclamação", messages: ["Comprei ontem e o barulho continuou."], expectedIntent: "service_opportunity", expectedDepartment: "Oficina" },
  { id: "produto-inexistente", title: "produto inexistente", messages: ["Vocês têm peça do carro importado modelo raro 1998?"], expectedIntent: "parts_quote", expectedDepartment: "Balcão" },
  { id: "estoque-zero", title: "estoque zero", messages: ["No site diz indisponível, consegue confirmar estoque?"], expectedIntent: "commercial_conversation", expectedDepartment: "Balcão" },
  { id: "linguagem-informal", title: "linguagem informal", messages: ["fala chefe, tem filtro pro corsinha 2008 aí?"], expectedIntent: "parts_quote", expectedDepartment: "Balcão" },
  { id: "mensagem-curta", title: "mensagem curta", messages: ["tem?"], expectedIntent: "commercial_conversation", expectedDepartment: "Balcão" },
  { id: "sem-intencao", title: "sem intenção comercial", messages: ["Bom dia."], expectedIntent: "commercial_conversation", expectedDepartment: "Balcão" },
  { id: "compatibilidade", title: "compatibilidade", messages: ["Essa vela serve no Corsa 2008?"], expectedIntent: "parts_quote", expectedDepartment: "Balcão", expectedRisk: "application_requires_safe_match" },
  { id: "aplicacao-sem-match", title: "aplicação sem match", messages: ["Dá certo no meu carro?"], expectedIntent: "commercial_conversation", expectedDepartment: "Balcão", expectedRisk: "application_requires_safe_match" },
  { id: "urgencia", title: "urgência", messages: ["Preciso urgente de amortecedor do Gol 2012."], expectedIntent: "parts_quote", expectedDepartment: "Balcão" },
  { id: "negociacao", title: "negociação", messages: ["Se melhorar o preço eu fecho hoje."], expectedIntent: "price_check", expectedDepartment: "Balcão" },
  { id: "nota-fiscal", title: "nota fiscal", messages: ["Vocês emitem nota e boleto?"], expectedIntent: "commercial_conversation", expectedDepartment: "Financeiro" },
  { id: "servico-barulho", title: "serviço por sintoma", messages: ["Meu carro está com barulho quando freia."], expectedIntent: "service_opportunity", expectedDepartment: "Oficina" },
  { id: "instalacao", title: "instalação", messages: ["Comprando a peça vocês instalam?"], expectedIntent: "commercial_conversation", expectedDepartment: "Balcão" },
  { id: "follow-up", title: "follow-up", messages: ["Vi o orçamento e retorno mais tarde."], expectedIntent: "commercial_conversation", expectedDepartment: "Balcão" },
  { id: "cliente-pronto", title: "cliente pronto", messages: ["Pode fechar, quero ficar com essa opção."], expectedIntent: "commercial_conversation", expectedDepartment: "Balcão" },
  { id: "grupo-negado", title: "conteúdo que parece grupo", messages: ["Pessoal do grupo perguntou se vocês têm filtro."], expectedIntent: "parts_quote", expectedDepartment: "Balcão" },
];
