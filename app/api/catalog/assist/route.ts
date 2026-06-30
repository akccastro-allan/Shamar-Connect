/**
 * POST /api/catalog/assist
 * Identifica intenção, detecta campos faltantes, sugere resposta e encaminha departamento.
 * Primeira versão: regras por palavras-chave sem IA externa.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { resolveDepartmentRouting, LIPS_ROUTING, type Department } from "@/lib/tenant-routing";

export const dynamic = "force-dynamic";

type Intent = "parts" | "workshop" | "greeting" | "unknown";

const PARTS_KEYWORDS = [
  "peça", "peças", "pastilha", "filtro", "óleo", "bateria", "amortecedor",
  "pneu", "palheta", "lâmpada", "produto", "preço", "estoque", "tem ",
  "valor", "quanto", "custa", "suspensão",
];

const WORKSHOP_KEYWORDS = [
  "agendar", "agendamento", "serviço", "oficina", "revisão", "trocar",
  "troca de óleo", "alinhamento", "balanceamento", "diagnóstico",
  "instalar", "manutenção", "marcar",
];

const GREETING_KEYWORDS = [
  "bom dia", "boa tarde", "boa noite", "oi", "olá", "hello", "bom tarde",
];

const BRAKE_POSITION_KEYWORDS = ["dianteiro", "traseiro", "dianteira", "traseira", "frente", "trás"];

function detectIntent(text: string): Intent {
  const lower = text.toLowerCase();
  if (WORKSHOP_KEYWORDS.some((k) => lower.includes(k))) return "workshop";
  if (PARTS_KEYWORDS.some((k) => lower.includes(k))) return "parts";
  if (GREETING_KEYWORDS.some((k) => lower.includes(k))) return "greeting";
  return "unknown";
}

// Extração simples de ano de veículo: 4 dígitos entre 1980 e 2030, ou 2 dígitos (20xx/19xx)
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

function buildPartsReply(
  productName: string | null,
  context: { vehicle?: string; year?: number; position?: string; missingFields: string[] },
  catalogHit: CatalogResult | null,
): string {
  if (context.missingFields.length > 0) {
    const field = context.missingFields[0];
    if (field === "vehicle") return "Claro! Para qual veículo (modelo) você precisa?";
    if (field === "year") return `Qual o ano do ${context.vehicle ?? "veículo"}?`;
    if (field === "position") return "Você precisa para o eixo dianteiro ou traseiro?";
    if (field === "product") return "Qual peça você está procurando?";
  }

  if (catalogHit) {
    const price = catalogHit.price != null
      ? `R$ ${catalogHit.price.toFixed(2).replace(".", ",")}`
      : "consulte o Balcão";
    const stock = catalogHit.stock_quantity != null
      ? `Estoque: ${catalogHit.stock_quantity} unidade(s).`
      : "";
    const sync = catalogHit.last_synced_at
      ? ` (atualizado em ${new Date(catalogHit.last_synced_at).toLocaleDateString("pt-BR")})`
      : "";
    return (
      `Encontramos: *${catalogHit.name}* — ${price}. ${stock}${sync}\n` +
      `Nosso Balcão confirma disponibilidade e prazo. Posso encaminhar?`
    );
  }

  const part = productName ?? "a peça";
  const vehicle = context.vehicle ? ` para ${context.vehicle}${context.year ? ` ${context.year}` : ""}` : "";
  return (
    `Vou verificar ${part}${vehicle} no nosso estoque. ` +
    `Aguarde um momento — nosso Balcão te confirma disponibilidade e preço.`
  );
}

type CatalogResult = {
  id: string;
  name: string;
  price: number | null;
  stock_quantity: number | null;
  last_synced_at: string | null;
  freshness: string;
  brand: string | null;
};

async function searchCatalog(
  db: ReturnType<typeof createSupabaseWriteClient>,
  tenantId: string,
  organizationId: string,
  query: string,
): Promise<CatalogResult[]> {
  if (!query || query.length < 2) return [];

  const { data } = await db
    .from("catalog_items")
    .select("id, name, price, stock_quantity, last_synced_at, brand")
    .eq("tenant_id", tenantId)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .or(`name.ilike.%${query}%,sku.ilike.%${query}%,brand.ilike.%${query}%`)
    .order("name")
    .limit(5);

  if (!data) return [];

  return (data as unknown as Array<{ id: string; name: string; price: number | null; stock_quantity: number | null; last_synced_at: string | null; brand: string | null }>).map((item) => {
    const diffHours = item.last_synced_at
      ? (Date.now() - new Date(item.last_synced_at).getTime()) / 3_600_000
      : Infinity;
    const freshness = diffHours <= 12 ? "fresh" : diffHours <= 48 ? "attention" : "stale";
    return { ...item, freshness };
  });
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getRequiredAppContext();

    const body = await request.json().catch(() => ({}));
    const text = String(body?.text || "").trim();
    const partialContext = (body?.context ?? {}) as {
      product?: string;
      vehicle?: string;
      year?: number | string;
      position?: string;
    };

    if (!text) {
      return NextResponse.json({ ok: false, error: "Campo 'text' é obrigatório." }, { status: 400 });
    }

    const intent = detectIntent(text);
    const lower = text.toLowerCase();

    const product = partialContext.product ?? null;
    const vehicle = partialContext.vehicle ?? null;
    let year: number | null = partialContext.year ? Number(partialContext.year) : extractYear(text);
    const position = partialContext.position ?? (BRAKE_POSITION_KEYWORDS.find((k) => lower.includes(k)) ?? null);

    let department: Department = "Geral";
    const missingFields: string[] = [];
    let suggestedReply = "";
    let catalogResults: CatalogResult[] = [];
    let shouldAskMoreInfo = false;

    if (intent === "parts") {
      department = "Balcão";

      // Determina quais campos faltam para completar a consulta
      if (!product && !text.match(/pastilha|filtro|pneu|palheta|bateria|amortecedor|lâmpada/)) {
        missingFields.push("product");
      }
      if (!vehicle && !year && text.length < 30) {
        // Só pede veículo se a mensagem for curta e não tiver modelo óbvio
        missingFields.push("vehicle");
      }
      if (vehicle && !year) {
        missingFields.push("year");
      }

      shouldAskMoreInfo = missingFields.length > 0;

      if (!shouldAskMoreInfo) {
        // Tenta buscar no catálogo
        const db = createSupabaseWriteClient();
        const searchTerm = product ?? text.split(" ").slice(0, 3).join(" ");
        catalogResults = await searchCatalog(db, ctx.tenantId, ctx.organizationId, searchTerm);

        // Só pergunta dianteira/traseira se houver variação real no resultado
        const hasPositionVariation =
          !position &&
          catalogResults.length > 1 &&
          catalogResults.some((r) => /dianteiro|dianteira|front/i.test(r.name)) &&
          catalogResults.some((r) => /traseiro|traseira|rear/i.test(r.name));

        if (hasPositionVariation) {
          missingFields.push("position");
          shouldAskMoreInfo = true;
        }
      }

      const bestHit = catalogResults[0] ?? null;
      suggestedReply = buildPartsReply(product, { vehicle: vehicle ?? undefined, year: year ?? undefined, position: position ?? undefined, missingFields }, bestHit);

    } else if (intent === "workshop") {
      department = "Oficina";
      suggestedReply =
        "Entendido! Vou encaminhar para nossa Oficina. Pode nos contar mais sobre o que precisa? " +
        "(tipo de serviço, veículo, sintoma que está sentindo)";

    } else if (intent === "greeting") {
      department = "Geral";
      const hour = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false });
      const h = parseInt(hour, 10);
      const greet = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
      suggestedReply = `${greet}! Bem-vindo à Lips Auto Center. Como posso te ajudar hoje?`;

    } else {
      department = "Geral";
      suggestedReply = "Olá! Como posso te ajudar?";
    }

    const routing = resolveDepartmentRouting(department, LIPS_ROUTING);

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
      catalogResults: catalogResults.length > 0 ? catalogResults : undefined,
      context: { product, vehicle, year, position },
    });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha na sugestão." }, { status: 500 });
  }
}
