/**
 * POST /api/catalog/assist
 * Identifica intenção, detecta campos faltantes, sugere resposta e encaminha departamento.
 * Primeira versão: regras por palavras-chave sem IA externa.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { resolveDepartmentRouting, LIPS_ROUTING, type Department } from "@/lib/tenant-routing";
import { expandSearchTerms, extractVehicleModel } from "@/lib/catalog/search-synonyms";

export const dynamic = "force-dynamic";

type Intent = "parts" | "workshop" | "greeting" | "unknown";

// Workshop antes de parts — "troca de óleo" deve ir para Oficina, não Balcão
const WORKSHOP_KEYWORDS = [
  "agendar", "agendamento", "serviço", "oficina", "revisão",
  "troca de óleo", "troca de oleo", "trocar óleo", "trocar oleo",
  "alinhamento", "balanceamento", "diagnóstico", "diagnostico",
  "instalar", "instalação", "manutenção", "manutencao", "marcar",
  "fazer revisão", "fazer revisao", "revisão geral",
];

const PARTS_KEYWORDS = [
  "peça", "peças", "pastilha", "filtro", "óleo", "oleo", "bateria",
  "amortecedor", "amort", "pneu", "palheta", "lâmpada", "lampada",
  "produto", "preço", "preco", "estoque", "tem ", "valor", "quanto",
  "custa", "suspensão", "suspensao", "freio", "plaqueta", "disco",
  "correia", "rolamento", "vela", "embreagem", "bucha", "balança",
  "pivô", "pivo", "bandeja", "kit", "jogo",
];

const GREETING_KEYWORDS = [
  "bom dia", "boa tarde", "boa noite", "oi", "olá", "ola", "hello", "ei ",
];

const BRAKE_POSITION_KEYWORDS = ["dianteiro", "traseiro", "dianteira", "traseira", "frente", "trás", "tras"];

// Produtos que não precisam de modelo (universais ou autocontidos na pergunta)
const UNIVERSAL_PARTS = /bateria|palheta|lâmpada|lampada/;

function detectIntent(text: string): Intent {
  const lower = text.toLowerCase();
  // workshop tem precedência — "troca de óleo" é serviço, não produto
  if (WORKSHOP_KEYWORDS.some((k) => lower.includes(k))) return "workshop";
  if (PARTS_KEYWORDS.some((k) => lower.includes(k))) return "parts";
  if (GREETING_KEYWORDS.some((k) => lower.includes(k))) return "greeting";
  return "unknown";
}

function extractYear(text: string): number | null {
  const fourDigit = text.match(/\b(19[89]\d|20[0-3]\d)\b/);
  if (fourDigit) return parseInt(fourDigit[1], 10);
  const twoDigit = text.match(/\b(\d{2})\b/);
  if (twoDigit) {
    const n = parseInt(twoDigit[1], 10);
    if (n >= 0 && n <= 30) return 2000 + n;
    if (n >= 80 && n <= 99) return 1900 + n;
  }
  return null;
}

// Extrai o termo do produto da mensagem do cliente
function extractProductTerm(text: string): string | null {
  const lower = text.toLowerCase();
  const productTerms = [
    "pastilha de freio", "pastilha freio", "pastilha",
    "filtro de óleo", "filtro de oleo", "filtro óleo", "filtro oleo",
    "filtro de ar", "filtro ar",
    "filtro de combustivel", "filtro combustivel",
    "filtro",
    "amortecedor dianteiro", "amortecedor traseiro", "amortecedor",
    "disco de freio", "disco freio",
    "correia dentada", "correia",
    "kit embreagem", "embreagem",
    "rolamento",
    "vela de ignição", "vela ignição", "vela",
    "palheta", "bateria", "pneu",
    "bucha", "balança", "pivô", "pivo", "bandeja",
    "freio",
  ];
  for (const term of productTerms) {
    if (lower.includes(term)) return term;
  }
  return null;
}

type CatalogResult = {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  stock_available: number | null;
  last_synced_at: string | null;
  brand: string | null;
};

async function searchCatalogForAssist(
  db: ReturnType<typeof createSupabaseWriteClient>,
  tenantId: string,
  organizationId: string,
  productTerm: string,
  vehicleModel: string | null,
): Promise<CatalogResult[]> {
  if (!productTerm || productTerm.length < 2) return [];

  const terms = expandSearchTerms(productTerm);

  // Condições de nome: cada sinônimo do produto
  const nameConditions = terms.map((t) => `name.ilike.%${t}%`);
  const orString = nameConditions.join(",");

  const query = db
    .from("catalog_items")
    .select("id, name, sku, price, stock_available, last_synced_at, brand")
    .eq("tenant_id", tenantId)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .or(orString)
    .order("name")
    .limit(10);

  // Filtro adicional pelo modelo de veículo, se identificado
  const { data } = vehicleModel
    ? await query.ilike("name", `%${vehicleModel}%`)
    : await query;

  if (!data) return [];

  // Se modelo filtrado não retornou resultados, busca sem filtro de modelo
  if (data.length === 0 && vehicleModel) {
    const { data: fallback } = await db
      .from("catalog_items")
      .select("id, name, sku, price, stock_available, last_synced_at, brand")
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .or(orString)
      .order("name")
      .limit(5);
    return (fallback ?? []) as unknown as CatalogResult[];
  }

  return data as unknown as CatalogResult[];
}

function buildPartsReply(params: {
  productTerm: string | null;
  vehicle: string | null;
  year: number | null;
  position: string | null;
  missingFields: string[];
  bestHit: CatalogResult | null;
  allHits: CatalogResult[];
}): string {
  const { productTerm, vehicle, year, position, missingFields, bestHit, allHits } = params;

  if (missingFields.length > 0) {
    const field = missingFields[0];
    if (field === "vehicle") return "Claro! Para qual veículo (modelo e ano) você precisa?";
    if (field === "year") return `Qual o ano do ${vehicle ?? "veículo"}?`;
    if (field === "position") return "Você precisa para o eixo dianteiro ou traseiro?";
    if (field === "product") return "Qual peça você está procurando?";
  }

  if (bestHit) {
    const price =
      bestHit.price != null && bestHit.price > 0
        ? `R$ ${bestHit.price.toFixed(2).replace(".", ",")}`
        : "preço a consultar";
    const stock =
      bestHit.stock_available != null && bestHit.stock_available > 0
        ? `Estoque: ${bestHit.stock_available} unid.`
        : "Sem estoque disponível no momento.";
    const sync = bestHit.last_synced_at
      ? ` (catálogo atualizado em ${new Date(bestHit.last_synced_at).toLocaleDateString("pt-BR")})`
      : "";
    const more = allHits.length > 1 ? ` Encontramos ${allHits.length} opções no total.` : "";

    return (
      `Encontramos: *${bestHit.name}* — ${price}. ${stock}${sync}${more}\n` +
      `Nosso Balcão confirma disponibilidade, aplicação e prazo. Posso encaminhar?`
    );
  }

  const part = productTerm ?? "a peça";
  const vehicleStr = vehicle
    ? ` para ${vehicle}${year ? ` ${year}` : ""}${position ? ` (${position})` : ""}`
    : "";
  return (
    `Vou verificar ${part}${vehicleStr} no nosso estoque. ` +
    `Aguarde um momento — nosso Balcão confirma disponibilidade e preço. ` +
    `Não fazemos reserva sem confirmação do setor responsável.`
  );
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getRequiredAppContext();

    const body = await request.json().catch(() => ({}));
    // aceita tanto "message" (painel) quanto "text" (uso legado)
    const text = String(body?.message ?? body?.text ?? "").trim();
    const partialContext = (body?.context ?? {}) as {
      product?: string;
      vehicle?: string;
      year?: number | string;
      position?: string;
    };

    if (!text) {
      return NextResponse.json(
        { ok: false, error: "Campo 'message' é obrigatório." },
        { status: 400 },
      );
    }

    const intent = detectIntent(text);
    const lower = text.toLowerCase();

    const productTerm = partialContext.product ?? extractProductTerm(text);
    const vehicle = partialContext.vehicle ?? extractVehicleModel(text);
    const year: number | null = partialContext.year ? Number(partialContext.year) : extractYear(text);
    const position = partialContext.position ?? (BRAKE_POSITION_KEYWORDS.find((k) => lower.includes(k)) ?? null);

    let department: Department = "Geral";
    const missingFields: string[] = [];
    let suggestedReply = "";
    let catalogHits: CatalogResult[] = [];
    let shouldAskMoreInfo = false;

    if (intent === "parts") {
      department = "Balcão";

      if (!productTerm) {
        missingFields.push("product");
      } else if (!UNIVERSAL_PARTS.test(lower)) {
        // Peças não-universais precisam de modelo
        if (!vehicle && !year && text.length < 25) {
          missingFields.push("vehicle");
        } else if (vehicle && !year) {
          missingFields.push("year");
        }
      }

      shouldAskMoreInfo = missingFields.length > 0;

      if (!shouldAskMoreInfo && productTerm) {
        const db = createSupabaseWriteClient();
        catalogHits = await searchCatalogForAssist(
          db,
          ctx.tenantId,
          ctx.organizationId,
          productTerm,
          vehicle,
        );

        // Pergunta dianteiro/traseiro só se houver variação real
        const hasPositionVariation =
          !position &&
          catalogHits.length > 1 &&
          catalogHits.some((r) => /dianteiro|dianteira|front/i.test(r.name)) &&
          catalogHits.some((r) => /traseiro|traseira|rear/i.test(r.name));

        if (hasPositionVariation) {
          missingFields.push("position");
          shouldAskMoreInfo = true;
        }
      }

      suggestedReply = buildPartsReply({
        productTerm,
        vehicle,
        year,
        position,
        missingFields,
        bestHit: catalogHits[0] ?? null,
        allHits: catalogHits,
      });

    } else if (intent === "workshop") {
      department = "Oficina";
      suggestedReply =
        "Entendido! Vou encaminhar para nossa Oficina. " +
        "Pode nos contar mais sobre o serviço, veículo e algum sintoma que esteja sentindo?";

    } else if (intent === "greeting") {
      department = "Geral";
      const hour = new Date().toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        hour12: false,
      });
      const h = parseInt(hour, 10);
      const greet = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
      suggestedReply = `${greet}! Bem-vindo à Lips Auto Center. Como posso te ajudar hoje?`;

    } else {
      department = "Geral";
      suggestedReply =
        "Olá! Pode nos contar mais sobre o que você precisa? " +
        "Atendemos peças (Balcão) e serviços de oficina.";
    }

    const routing = resolveDepartmentRouting(department, LIPS_ROUTING);

    // Normaliza hits para o shape esperado pelo painel (AssistResult.items)
    const items = catalogHits.map((h) => ({
      id: h.id,
      name: h.name,
      sku: h.sku,
      price: h.price,
      brand: h.brand,
      stock_available: h.stock_available,
    }));

    return NextResponse.json({
      ok: true,
      intent,
      department,
      slaMinutes: routing.slaMinutes,
      withinBusinessHours: routing.withinBusinessHours,
      outOfHoursMessage: routing.outOfHoursMessage,
      missingFields,
      shouldAskMoreInfo,
      shouldEscalate: false,
      suggestedReply,
      items,
      context: { product: productTerm, vehicle, year, position },
    });
  } catch (error) {
    if (isUnauthorizedError(error))
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha na sugestão." },
      { status: 500 },
    );
  }
}
