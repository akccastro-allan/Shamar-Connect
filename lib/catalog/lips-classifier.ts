export type PartFamily =
  | "pastilha_freio"
  | "disco_freio"
  | "amortecedor"
  | "correia_dentada"
  | "correia_alternador"
  | "capa_correia"
  | "protetor_correia"
  | "filtro_oleo"
  | "filtro_ar"
  | "filtro_combustivel"
  | "filtro_cabine"
  | "bomba_agua"
  | "bomba_oleo"
  | "vela"
  | "cabo_vela"
  | "sensor"
  | "kit"
  | "other";

export type CatalogPosition = "front" | "rear";
export type CatalogSide = "left" | "right";
export type CatalogVerticalPosition = "upper" | "lower";

export type CatalogQueryClassification = {
  family: PartFamily | null;
  vehicle?: string;
  year?: number;
  position?: CatalogPosition;
  side?: CatalogSide;
  verticalPosition?: CatalogVerticalPosition;
  missingRequiredFields: string[];
  confidence: number;
};

export type CatalogCandidateScore = {
  itemId: string;
  score: number;
  familyMatch: boolean;
  vehicleMatch: boolean;
  yearMatch: boolean;
  positionMatch: boolean;
  sideMatch: boolean;
  verticalPositionMatch: boolean;
  accessoryPenalty: number;
  confidence: number;
  reasons: string[];
};

export type CatalogItemLike = {
  id?: string;
  name?: string | null;
  sku?: string | null;
  brand?: string | null;
  price?: number | null;
  stock_quantity?: number | null;
};

export type PartFamilyRule = {
  requiresVehicle: boolean;
  requiresYear: boolean;
  mayRequirePosition: boolean;
  mayRequireSide: boolean;
  mayRequireVerticalPosition?: boolean;
  positiveTerms: string[];
  negativeTerms: string[];
};

const FAMILY_ORDER: PartFamily[] = [
  "cabo_vela",
  "kit",
  "pastilha_freio",
  "disco_freio",
  "amortecedor",
  "correia_alternador",
  "correia_dentada",
  "capa_correia",
  "protetor_correia",
  "filtro_oleo",
  "filtro_ar",
  "filtro_combustivel",
  "filtro_cabine",
  "bomba_agua",
  "bomba_oleo",
  "vela",
  "sensor",
];

export const PART_FAMILY_RULES: Record<PartFamily, PartFamilyRule> = {
  pastilha_freio: {
    requiresVehicle: true,
    requiresYear: true,
    mayRequirePosition: true,
    mayRequireSide: false,
    positiveTerms: ["pastilha", "past freio", "pastilha freio", "pastilha de freio", "plaqueta"],
    negativeTerms: ["disco", "sapata", "mola", "kit rep"],
  },
  disco_freio: {
    requiresVehicle: true,
    requiresYear: true,
    mayRequirePosition: true,
    mayRequireSide: false,
    positiveTerms: ["disco freio", "disco de freio", "disco"],
    negativeTerms: ["pastilha", "sapata", "mola", "mangueira", "mang", "trava"],
  },
  amortecedor: {
    requiresVehicle: true,
    requiresYear: true,
    mayRequirePosition: true,
    mayRequireSide: true,
    positiveTerms: ["amortecedor", "amort"],
    negativeTerms: ["coxim", "batente", "mola", "kit amort", "kit amor"],
  },
  correia_dentada: {
    requiresVehicle: true,
    requiresYear: true,
    mayRequirePosition: false,
    mayRequireSide: false,
    positiveTerms: ["correia dentada", "corr dentada", "corr dent", "correia den", "corr den"],
    negativeTerms: ["capa", "protetor", "tampa", "chave", "corrente", "alternador", "corr alt", "bomba", "c corr"],
  },
  correia_alternador: {
    requiresVehicle: true,
    requiresYear: true,
    mayRequirePosition: false,
    mayRequireSide: false,
    positiveTerms: ["correia alternador", "corr alt", "correia alt"],
    negativeTerms: ["capa", "protetor", "tampa", "chave", "corrente", "dentada", "corr dent", "bomba"],
  },
  capa_correia: {
    requiresVehicle: true,
    requiresYear: true,
    mayRequirePosition: false,
    mayRequireSide: false,
    mayRequireVerticalPosition: true,
    positiveTerms: ["capa correia", "capa cor dent", "capa correia den", "capa cor", "capa corre"],
    negativeTerms: ["correia alt", "corr alt", "chave", "corrente"],
  },
  protetor_correia: {
    requiresVehicle: true,
    requiresYear: true,
    mayRequirePosition: false,
    mayRequireSide: false,
    positiveTerms: ["protetor correia", "protetor corr", "protetor correia dentada"],
    negativeTerms: ["capa", "chave", "corrente", "carter"],
  },
  filtro_oleo: {
    requiresVehicle: true,
    requiresYear: true,
    mayRequirePosition: false,
    mayRequireSide: false,
    positiveTerms: ["filtro oleo", "filtro de oleo", "filtro lubrificante"],
    negativeTerms: ["filtro ar", "filtro combustivel", "filtro cabine", "chave filtro", "carc filtro"],
  },
  filtro_ar: {
    requiresVehicle: true,
    requiresYear: true,
    mayRequirePosition: false,
    mayRequireSide: false,
    positiveTerms: ["filtro ar", "filtro de ar"],
    negativeTerms: ["filtro oleo", "filtro combustivel", "filtro cabine", "chave filtro"],
  },
  filtro_combustivel: {
    requiresVehicle: true,
    requiresYear: true,
    mayRequirePosition: false,
    mayRequireSide: false,
    positiveTerms: ["filtro combustivel", "filtro de combustivel"],
    negativeTerms: ["filtro ar", "filtro oleo", "filtro cabine", "chave filtro"],
  },
  filtro_cabine: {
    requiresVehicle: true,
    requiresYear: true,
    mayRequirePosition: false,
    mayRequireSide: false,
    positiveTerms: ["filtro cabine", "filtro de cabine", "filtro ar condicionado"],
    negativeTerms: ["filtro ar", "filtro oleo", "filtro combustivel", "chave filtro"],
  },
  bomba_agua: {
    requiresVehicle: true,
    requiresYear: true,
    mayRequirePosition: false,
    mayRequireSide: false,
    positiveTerms: ["bomba agua", "bomba de agua", "bomba d agua", "bomba dagua", "b d agua"],
    negativeTerms: ["bomba oleo", "bomba combustivel"],
  },
  bomba_oleo: {
    requiresVehicle: true,
    requiresYear: true,
    mayRequirePosition: false,
    mayRequireSide: false,
    positiveTerms: ["bomba oleo", "bomba de oleo"],
    negativeTerms: ["bomba agua", "bomba combustivel"],
  },
  vela: {
    requiresVehicle: true,
    requiresYear: true,
    mayRequirePosition: false,
    mayRequireSide: false,
    positiveTerms: ["vela", "velas"],
    negativeTerms: ["cabo vela", "cabo de vela"],
  },
  cabo_vela: {
    requiresVehicle: true,
    requiresYear: true,
    mayRequirePosition: false,
    mayRequireSide: false,
    positiveTerms: ["cabo vela", "cabo de vela"],
    negativeTerms: ["vela ignicao"],
  },
  sensor: {
    requiresVehicle: true,
    requiresYear: true,
    mayRequirePosition: false,
    mayRequireSide: false,
    positiveTerms: ["sensor", "sens", "sonda"],
    negativeTerms: ["c sensor", "s sensor", "chicote", "suporte sensor", "mang"],
  },
  kit: {
    requiresVehicle: true,
    requiresYear: true,
    mayRequirePosition: true,
    mayRequireSide: true,
    positiveTerms: ["kit"],
    negativeTerms: ["camisa do brasil", "chapeu do brasil", "gnv"],
  },
  other: {
    requiresVehicle: false,
    requiresYear: false,
    mayRequirePosition: false,
    mayRequireSide: false,
    positiveTerms: [],
    negativeTerms: [],
  },
};

const VEHICLE_ALIASES: Record<string, string[]> = {
  gol: ["gol"],
  golf: ["golf"],
  polo: ["polo", "pol"],
  fox: ["fox"],
  uno: ["uno"],
  palio: ["palio", "palio fire", "pálio", "pal"],
  corsa: ["corsa", "cors"],
  celta: ["celta", "celt"],
  prisma: ["prisma"],
  onix: ["onix"],
  astra: ["astra"],
  meriva: ["meriva", "mer"],
  vectra: ["vectra"],
  kombi: ["kombi"],
  fiesta: ["fiesta"],
  ka: ["ka"],
  corolla: ["corolla"],
  civic: ["civic"],
  kwid: ["kwid"],
  hb20: ["hb20"],
  saveiro: ["saveiro", "sav"],
  strada: ["strada"],
  voyage: ["voyage", "voy"],
  sandero: ["sandero"],
};

const POSITION_ALIASES = {
  front: ["dianteiro", "dianteira", "diant", "frente"],
  rear: ["traseiro", "traseira", "tras", "traz", "trazeiro", "trazeira"],
  right: ["ld", "lado direito", "direito", "direita", "l d"],
  left: ["le", "lado esquerdo", "esquerdo", "esquerda", "l e"],
  upper: ["sup", "superior"],
  lower: ["inf", "inferior"],
};

export function normalizeCatalogText(text: string | null | undefined): string {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b([a-z])\.([a-z])\b/g, "$1$2")
    .replace(/[^a-z0-9/\s.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesToken(text: string, term: string) {
  const normalizedTerm = normalizeCatalogText(term);
  if (!normalizedTerm) return false;
  if (normalizedTerm.includes(" ")) return text.includes(normalizedTerm);
  return new RegExp(`(^|\\s|/)${normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|/|$)`).test(text);
}

function hasAny(text: string, terms: string[]) {
  return terms.some(term => includesToken(text, term));
}

export function detectPartFamily(text: string): PartFamily | null {
  const normalized = normalizeCatalogText(text);
  if (!normalized) return null;

  if (includesToken(normalized, "filtro")) {
    if (includesToken(normalized, "oleo") || includesToken(normalized, "lubrificante")) return "filtro_oleo";
    if (includesToken(normalized, "combustivel")) return "filtro_combustivel";
    if (includesToken(normalized, "cabine") || normalized.includes("ar condicionado")) return "filtro_cabine";
    if (includesToken(normalized, "ar")) return "filtro_ar";
  }

  if (includesToken(normalized, "bomba")) {
    if (includesToken(normalized, "agua")) return "bomba_agua";
    if (includesToken(normalized, "oleo")) return "bomba_oleo";
  }

  if (includesToken(normalized, "disco")) return "disco_freio";

  if (includesToken(normalized, "correia") || includesToken(normalized, "corr")) {
    if (includesToken(normalized, "capa")) return "capa_correia";
    if (includesToken(normalized, "protetor")) return "protetor_correia";
    if (includesToken(normalized, "alternador") || includesToken(normalized, "alt")) return "correia_alternador";
    if (includesToken(normalized, "dentada") || includesToken(normalized, "dent") || includesToken(normalized, "den")) return "correia_dentada";
  }

  for (const family of FAMILY_ORDER) {
    const rule = PART_FAMILY_RULES[family];
    if (hasAny(normalized, rule.positiveTerms)) return family;
  }

  if (includesToken(normalized, "filtro")) return null;
  if (includesToken(normalized, "correia") || includesToken(normalized, "corr")) return null;
  if (includesToken(normalized, "bomba")) return null;
  return null;
}

export function extractVehicle(text: string): string | undefined {
  const normalized = normalizeCatalogText(text);
  for (const [vehicle, aliases] of Object.entries(VEHICLE_ALIASES)) {
    if (aliases.some(alias => includesToken(normalized, alias))) return vehicle;
  }
  return undefined;
}

export function normalizeTwoDigitYear(value: number): number {
  const currentYear = new Date().getFullYear() % 100;
  return value <= currentYear + 1 ? 2000 + value : 1900 + value;
}

export function extractApplicationYear(text: string): number | undefined {
  const normalized = normalizeCatalogText(text);
  const fullYear = normalized.match(/\b(19|20)\d{2}\b/);
  if (fullYear) return Number(fullYear[0]);

  const twoDigit = normalized.match(/(^|\s)(\d{2})(\s|$)/);
  if (!twoDigit) return undefined;
  const value = Number(twoDigit[2]);
  if (Number.isNaN(value)) return undefined;
  return normalizeTwoDigitYear(value);
}

export function extractPosition(text: string): CatalogPosition | undefined {
  const normalized = normalizeCatalogText(text);
  if (POSITION_ALIASES.front.some(alias => includesToken(normalized, alias))) return "front";
  if (POSITION_ALIASES.rear.some(alias => includesToken(normalized, alias))) return "rear";
  return undefined;
}

export function extractSide(text: string): CatalogSide | undefined {
  const normalized = normalizeCatalogText(text);
  if (POSITION_ALIASES.right.some(alias => includesToken(normalized, alias))) return "right";
  if (POSITION_ALIASES.left.some(alias => includesToken(normalized, alias))) return "left";
  return undefined;
}

export function extractVerticalPosition(text: string): CatalogVerticalPosition | undefined {
  const normalized = normalizeCatalogText(text);
  if (POSITION_ALIASES.upper.some(alias => includesToken(normalized, alias))) return "upper";
  if (POSITION_ALIASES.lower.some(alias => includesToken(normalized, alias))) return "lower";
  return undefined;
}

function isGenericFamilyQuery(text: string, family: PartFamily | null) {
  const normalized = normalizeCatalogText(text);
  return (
    !family &&
    (includesToken(normalized, "filtro") || includesToken(normalized, "correia") || includesToken(normalized, "corr") || includesToken(normalized, "bomba"))
  );
}

export function classifyCatalogQuery(text: string): CatalogQueryClassification {
  const family = detectPartFamily(text);
  const vehicle = extractVehicle(text);
  const year = extractApplicationYear(text);
  const position = extractPosition(text);
  const side = extractSide(text);
  const verticalPosition = extractVerticalPosition(text);
  const missingRequiredFields: string[] = [];

  if (isGenericFamilyQuery(text, family)) {
    if (normalizeCatalogText(text).includes("filtro")) missingRequiredFields.push("tipo do filtro");
    else if (normalizeCatalogText(text).includes("bomba")) missingRequiredFields.push("tipo da bomba");
    else missingRequiredFields.push("tipo da correia");
  }

  if (family) {
    const rule = PART_FAMILY_RULES[family];
    if (rule.requiresVehicle && !vehicle) missingRequiredFields.push("modelo do veículo");
    if (rule.requiresYear && !year) missingRequiredFields.push("ano do veículo");
  }

  const confidence = family ? 0.8 + (vehicle ? 0.08 : 0) + (year ? 0.08 : 0) : missingRequiredFields.length ? 0.5 : 0;
  return { family, vehicle, year, position, side, verticalPosition, missingRequiredFields, confidence: Math.min(confidence, 0.96) };
}

export function classifyMainOrAccessory(item: CatalogItemLike, family: PartFamily): "main" | "accessory" | "excluded" {
  const text = normalizeCatalogText(`${item.name || ""} ${item.sku || ""} ${item.brand || ""}`);
  const rule = PART_FAMILY_RULES[family];
  if (hasAny(text, rule.negativeTerms)) return "excluded";
  if (["capa_correia", "protetor_correia"].includes(family)) return "accessory";
  return "main";
}

function itemHasYearMatch(itemText: string, year: number | undefined): boolean {
  if (!year) return false;
  if (itemText.includes(String(year))) return true;

  const ranges = Array.from(itemText.matchAll(/(?:^|\D)(\d{2})(?:\s*)\/(?:\s*)(\d{2}|\.{1,3})/g));
  for (const match of ranges) {
    const start = Number(match[1]);
    const endRaw = match[2];
    const startYear = normalizeTwoDigitYear(start);
    if (/^\.{1,3}$/.test(endRaw)) {
      if (year >= startYear) return true;
      continue;
    }
    const end = Number(endRaw);
    if (Number.isNaN(end)) continue;
    const endYear = normalizeTwoDigitYear(end);
    if (year >= startYear && year <= endYear) return true;
  }

  const openEndedRanges = Array.from(itemText.matchAll(/(?:^|\D)(\d{2})\s*\.{2,3}/g));
  for (const match of openEndedRanges) {
    const start = Number(match[1]);
    if (!Number.isNaN(start) && year >= normalizeTwoDigitYear(start)) return true;
  }

  const untilRanges = Array.from(itemText.matchAll(/\.{2,3}\s*\/?\s*(\d{2})/g));
  for (const match of untilRanges) {
    const end = Number(match[1]);
    if (!Number.isNaN(end) && year <= normalizeTwoDigitYear(end)) return true;
  }

  return false;
}

function itemHasVehicleYearMatch(itemText: string, vehicle: string | undefined, year: number | undefined): boolean {
  if (!vehicle || !year) return itemHasYearMatch(itemText, year);

  const aliases = VEHICLE_ALIASES[vehicle] || [vehicle];
  for (const alias of aliases) {
    const normalizedAlias = normalizeCatalogText(alias);
    if (!normalizedAlias) continue;

    let index = itemText.indexOf(normalizedAlias);
    while (index >= 0) {
      const end = Math.min(itemText.length, index + normalizedAlias.length + 60);
      if (itemHasYearMatch(itemText.slice(index, end), year)) return true;
      index = itemText.indexOf(normalizedAlias, index + normalizedAlias.length);
    }
  }

  return false;
}

export function scoreCatalogCandidate(item: CatalogItemLike, query: CatalogQueryClassification): CatalogCandidateScore {
  const text = normalizeCatalogText(`${item.name || ""} ${item.sku || ""} ${item.brand || ""}`);
  const family = query.family || "other";
  const rule = PART_FAMILY_RULES[family];
  const reasons: string[] = [];
  let score = 0;
  let accessoryPenalty = 0;

  const familyMatch = query.family ? hasAny(text, rule.positiveTerms) && !hasAny(text, rule.negativeTerms) : false;
  if (familyMatch) {
    score += 35;
    reasons.push("family_match");
  } else if (query.family) {
    accessoryPenalty += 30;
    reasons.push("family_mismatch_or_negative_term");
  }

  const vehicleMatch = Boolean(query.vehicle && hasAny(text, VEHICLE_ALIASES[query.vehicle] || [query.vehicle]));
  if (vehicleMatch) {
    score += 25;
    reasons.push("vehicle_match");
  }

  const yearMatch = itemHasVehicleYearMatch(text, query.vehicle, query.year);
  if (yearMatch) {
    score += 20;
    reasons.push("year_match");
  }

  const itemPosition = extractPosition(text);
  const itemSide = extractSide(text);
  const itemVerticalPosition = extractVerticalPosition(text);
  const positionMatch = !query.position || itemPosition === query.position;
  const sideMatch = !query.side || itemSide === query.side;
  const verticalPositionMatch = !query.verticalPosition || itemVerticalPosition === query.verticalPosition;

  if (query.position && positionMatch) score += 8;
  if (query.side && sideMatch) score += 8;
  if (query.verticalPosition && verticalPositionMatch) score += 8;

  if (typeof item.price === "number" && item.price > 0) {
    score += 10;
    reasons.push("valid_price");
  }
  if (typeof item.stock_quantity === "number" && item.stock_quantity > 0) score += 2;
  if (typeof item.stock_quantity === "number" && item.stock_quantity < 0) reasons.push("stock_negative");

  score = Math.max(0, score - accessoryPenalty);
  const requiredFlagsOk = Boolean(
    familyMatch &&
      (!rule.requiresVehicle || vehicleMatch) &&
      (!rule.requiresYear || yearMatch) &&
      positionMatch &&
      sideMatch &&
      verticalPositionMatch &&
      typeof item.price === "number" &&
      item.price > 0,
  );

  return {
    itemId: item.id || "",
    score,
    familyMatch,
    vehicleMatch,
    yearMatch,
    positionMatch,
    sideMatch,
    verticalPositionMatch,
    accessoryPenalty,
    confidence: requiredFlagsOk ? Math.min(score / 100, 0.98) : Math.min(score / 140, 0.74),
    reasons,
  };
}

export function queryNeedsPositionFromCandidates(query: CatalogQueryClassification, items: CatalogItemLike[]): boolean {
  if (!query.family || !PART_FAMILY_RULES[query.family].mayRequirePosition || query.position) return false;
  const positions = new Set(items.map(item => extractPosition(item.name || "")).filter(Boolean));
  return positions.size > 1;
}

export function queryNeedsSideFromCandidates(query: CatalogQueryClassification, items: CatalogItemLike[]): boolean {
  if (!query.family || !PART_FAMILY_RULES[query.family].mayRequireSide || query.side) return false;
  const sides = new Set(items.map(item => extractSide(item.name || "")).filter(Boolean));
  return sides.size > 1;
}

export function queryNeedsVerticalPositionFromCandidates(query: CatalogQueryClassification, items: CatalogItemLike[]): boolean {
  if (!query.family || !PART_FAMILY_RULES[query.family].mayRequireVerticalPosition || query.verticalPosition) return false;
  const positions = new Set(items.map(item => extractVerticalPosition(item.name || "")).filter(Boolean));
  return positions.size > 1;
}
