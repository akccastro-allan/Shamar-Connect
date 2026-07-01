/**
 * Expansão de sinônimos para busca de peças automotivas.
 * O catálogo CPlus usa nomenclatura técnica/abreviada.
 * Este mapeamento traduz termos do cliente para termos do catálogo.
 */

const SYNONYM_MAP: Array<{ keys: string[]; terms: string[] }> = [
  {
    keys: ["pastilha de freio", "pastilha freio"],
    terms: ["pastilha", "plaqueta", "past"],
  },
  {
    keys: ["pastilha"],
    terms: ["pastilha", "plaqueta", "past"],
  },
  {
    keys: ["freio corolla cross", "freio corolla"],
    terms: ["freio", "pastilha", "plaqueta", "disco", "corolla"],
  },
  {
    keys: ["freio"],
    terms: ["freio", "pastilha", "plaqueta", "lona", "disco freio"],
  },
  {
    keys: ["filtro de óleo", "filtro de oleo", "filtro oleo", "filtro óleo"],
    terms: ["filtro oleo", "filtro óleo", "carc filtro"],
  },
  {
    keys: ["filtro de ar", "filtro ar"],
    terms: ["filtro ar", "filtro de ar"],
  },
  {
    keys: ["filtro de combustivel", "filtro combustivel", "filtro combustível"],
    terms: ["filtro comb", "filtro combustivel"],
  },
  {
    keys: ["filtro"],
    terms: ["filtro", "filt"],
  },
  {
    keys: ["óleo", "oleo"],
    terms: ["oleo", "óleo", "lubrificante"],
  },
  {
    keys: ["amortecedor dianteiro", "amort diant"],
    terms: ["amort diant", "amortecedor diant"],
  },
  {
    keys: ["amortecedor traseiro", "amort tras"],
    terms: ["amort tras", "amortecedor tras"],
  },
  {
    keys: ["amortecedor", "amort"],
    terms: ["amort", "amortecedor"],
  },
  {
    keys: ["corolla cross"],
    terms: ["corolla", "cross"],
  },
  {
    keys: ["bateria"],
    terms: ["bateria"],
  },
  {
    keys: ["pneu"],
    terms: ["pneu"],
  },
  {
    keys: ["palheta", "limpador"],
    terms: ["palheta", "limpador"],
  },
  {
    keys: ["vela"],
    terms: ["vela ignição", "vela"],
  },
  {
    keys: ["correia dentada", "correia distribui"],
    terms: ["correia dent", "correia distrib"],
  },
  {
    keys: ["correia"],
    terms: ["correia"],
  },
  {
    keys: ["rolamento"],
    terms: ["rolamento", "rolam"],
  },
  {
    keys: ["disco de freio", "disco freio"],
    terms: ["disco freio", "disco de freio"],
  },
  {
    keys: ["kit embreagem", "embreagem"],
    terms: ["embreagem", "embr", "kit emb"],
  },
  {
    keys: ["bucha"],
    terms: ["bucha"],
  },
  {
    keys: ["balança", "bandeja"],
    terms: ["balança", "bandeja"],
  },
  {
    keys: ["pivô", "pivo"],
    terms: ["pivo", "pivô"],
  },
  {
    keys: ["barra estabilizadora", "barra estab"],
    terms: ["barra estab", "barra estabilizadora"],
  },
];

/**
 * Expande um termo de busca do cliente em múltiplos termos do catálogo.
 * Retorna array com termos únicos (sem duplicatas), mantendo o termo original.
 * Se nenhum sinônimo encontrado, retorna [termo original].
 */
export function expandSearchTerms(query: string): string[] {
  const lower = query.toLowerCase().trim();

  for (const { keys, terms } of SYNONYM_MAP) {
    if (keys.some((k) => lower.includes(k))) {
      // inclui o termo original se não estiver na lista
      const all = lower === terms[0] ? terms : [lower, ...terms];
      return [...new Set(all)];
    }
  }

  return [lower];
}

/**
 * Extrai o modelo do veículo de uma mensagem livre.
 * Retorna null se não identificar modelo.
 */
const VEHICLE_MODELS = [
  "corolla cross", "corolla", "hilux", "yaris", "sw4", "rav4", "etios",
  "onix", "prisma", "cruze", "tracker", "s10", "spin", "cobalt", "trailblazer",
  "hb20", "hb20s", "creta", "tucson", "santa fe", "azera", "elantra",
  "gol", "voyage", "fox", "polo", "jetta", "tiguan", "amarok", "saveiro",
  "palio", "uno", "siena", "strada", "toro", "argo", "cronos", "mobi",
  "ka", "fiesta", "focus", "ecosport", "ranger", "edge",
  "civic", "city", "fit", "hr-v", "wrv", "cr-v",
  "sandero", "logan", "duster", "kwid", "captur", "oroch",
  "l200", "eclipse cross", "asx", "outlander", "pajero",
  "frontier", "kicks", "march", "versa",
  "308", "408", "2008", "3008",
  "blazer", "vectra", "astra", "zafira",
  "montana",
];

export function extractVehicleModel(text: string): string | null {
  const lower = text.toLowerCase();
  // busca modelo mais longo primeiro (ex: "corolla cross" antes de "corolla")
  for (const model of VEHICLE_MODELS) {
    if (lower.includes(model)) return model;
  }
  return null;
}
