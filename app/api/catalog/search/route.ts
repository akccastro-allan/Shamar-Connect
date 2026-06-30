import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";

export const dynamic = "force-dynamic";

type CatalogItem = {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  brand: string | null;
  price: number | null;
  stock_quantity: number | null;
  last_synced_at: string | null;
  status: string;
  item_type: string;
  catalog_categories: { name: string } | null;
};

type FreshnessStatus = "fresh" | "attention" | "stale" | "unknown";

function freshnessStatus(lastSyncedAt: string | null): FreshnessStatus {
  if (!lastSyncedAt) return "unknown";
  const diffHours = (Date.now() - new Date(lastSyncedAt).getTime()) / 3_600_000;
  if (diffHours <= 12) return "fresh";
  if (diffHours <= 48) return "attention";
  return "stale";
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getRequiredAppContext();

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ ok: false, error: "Parâmetro 'q' deve ter ao menos 2 caracteres." }, { status: 400 });
    }

    const db = createSupabaseWriteClient();

    const { data: items, error } = await db
      .from("catalog_items")
      .select("id, name, description, sku, barcode, brand, price, stock_quantity, last_synced_at, status, item_type, catalog_categories(name)")
      .eq("tenant_id", ctx.tenantId)
      .eq("organization_id", ctx.organizationId)
      .eq("status", "active")
      .or(
        [
          `name.ilike.%${q}%`,
          `description.ilike.%${q}%`,
          `sku.ilike.%${q}%`,
          `barcode.ilike.%${q}%`,
          `brand.ilike.%${q}%`,
        ].join(","),
      )
      .order("name")
      .limit(30);

    if (error) throw error;

    const results = (items as unknown as CatalogItem[]).map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      sku: item.sku,
      barcode: item.barcode,
      brand: item.brand,
      price: item.price,
      stock_quantity: item.stock_quantity,
      last_synced_at: item.last_synced_at,
      freshness: freshnessStatus(item.last_synced_at),
      category: item.catalog_categories?.name ?? null,
      item_type: item.item_type,
    }));

    return NextResponse.json({ ok: true, results, total: results.length });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha na busca." }, { status: 500 });
  }
}
