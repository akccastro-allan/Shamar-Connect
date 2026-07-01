import { NextRequest, NextResponse } from "next/server";

import { AgentAuthError, getAuthenticatedAgent, touchAgentSeen } from "@/lib/integrations/agent-auth";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export const dynamic = "force-dynamic";

const MAX_BATCH_SIZE = 500;

function normalizeSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const normalized = Number(value.replace(",", "."));
    return Number.isFinite(normalized) ? normalized : null;
  }
  return null;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number") return String(value);
  return null;
}

function toBoolOrDefault(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
}

function pick<T>(obj: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key] as T;
  }
  return undefined;
}

async function getOrCreateCategory(params: {
  supabase: ReturnType<typeof createSupabaseWriteClient>;
  tenantId: string;
  organizationId: string;
  externalSource: string;
  categoryName: string;
}): Promise<string | null> {
  const { supabase, tenantId, organizationId, externalSource, categoryName } = params;
  const name = categoryName.trim();
  const externalId = normalizeSlug(name);

  if (!name || !externalId) return null;

  const { data: existing, error: lookupError } = await supabase
    .from("catalog_categories")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("external_source", externalSource)
    .eq("external_id", externalId)
    .limit(1)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing?.id) return existing.id;

  const { data: created, error: createError } = await supabase
    .from("catalog_categories")
    .insert({
      tenant_id: tenantId,
      organization_id: organizationId,
      external_source: externalSource,
      external_id: externalId,
      name,
      slug: externalId,
      is_active: true,
      metadata: { createdBy: "shamar_agent_sync" },
    })
    .select("id")
    .single();

  if (createError) throw createError;
  return created?.id || null;
}

export async function POST(request: NextRequest) {
  let syncRunId: string | null = null;
  let supabase: ReturnType<typeof createSupabaseWriteClient> | null = null;

  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const { agent, source } = await getAuthenticatedAgent(request);
    supabase = createSupabaseWriteClient();

    // Aceita tanto "items" quanto "products"
    const items = Array.isArray(body?.items)
      ? (body.items as Record<string, unknown>[])
      : Array.isArray(body?.products)
        ? (body.products as Record<string, unknown>[])
        : null;

    if (!items) {
      return NextResponse.json(
        { ok: false, error: "Payload inválido. O campo items ou products deve ser um array." },
        { status: 400 },
      );
    }

    if (items.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { ok: false, error: `Lote acima do limite permitido de ${MAX_BATCH_SIZE} itens.` },
        { status: 400 },
      );
    }

    const tenantId        = (agent as Record<string, unknown>).tenant_id        || (source as Record<string, unknown>).tenant_id;
    const organizationId  = (agent as Record<string, unknown>).organization_id  || (source as Record<string, unknown>).organization_id;
    const integrationSourceId = (source as Record<string, unknown>).id;
    const agentId         = (agent as Record<string, unknown>).id;
    const externalSource  = (source as Record<string, unknown>).source_type || "unknown";
    const startedAt       = new Date().toISOString();

    await touchAgentSeen(agentId as string, request);

    const { data: syncRun, error: syncRunError } = await supabase
      .from("integration_sync_runs")
      .insert({
        tenant_id: tenantId,
        organization_id: organizationId,
        integration_source_id: integrationSourceId,
        agent_id: agentId,
        sync_type: "catalog",
        status: "running",
        started_at: startedAt,
        items_received: items.length,
        items_created: 0,
        items_updated: 0,
        items_failed: 0,
        metadata: { source: "shamar_agent", operation: "sync_catalog" },
      })
      .select("id")
      .single();

    if (syncRunError) throw syncRunError;
    syncRunId = syncRun?.id || null;

    // ── 1. Resolver categorias únicas (cache em memória, N queries = N categorias distintas) ──
    const categoryCache = new Map<string, string | null>();
    const uniqueCategories = new Set<string>();

    for (const item of items) {
      const cat = toStringOrNull(pick(item, "category"));
      if (cat) uniqueCategories.add(cat);
    }

    for (const categoryName of uniqueCategories) {
      try {
        const id = await getOrCreateCategory({
          supabase,
          tenantId: tenantId as string,
          organizationId: organizationId as string,
          externalSource: externalSource as string,
          categoryName,
        });
        categoryCache.set(categoryName, id);
      } catch {
        categoryCache.set(categoryName, null);
      }
    }

    // ── 2. Normalizar itens e separar inválidos ──
    const now = new Date().toISOString();
    const payloads: Record<string, unknown>[] = [];
    let invalidCount = 0;

    for (const item of items) {
      const externalId = toStringOrNull(pick(item, "externalId", "external_id"));
      const name       = toStringOrNull(pick(item, "name"));

      if (!externalId || !name) {
        invalidCount += 1;
        continue;
      }

      const categoryName = toStringOrNull(pick(item, "category"));
      const categoryId   = categoryName ? (categoryCache.get(categoryName) ?? null) : null;
      const isActive     = toBoolOrDefault(pick(item, "isActive", "is_active"), true);
      const isAvailable  = toBoolOrDefault(pick(item, "isAvailable", "is_available"), true);
      const stockQty     = toNumberOrNull(pick(item, "stockQuantity", "stock_quantity"));

      payloads.push({
        tenant_id:         tenantId,
        organization_id:   organizationId,
        external_source:   externalSource,
        external_id:       externalId,
        sku:               toStringOrNull(pick(item, "sku")),
        barcode:           toStringOrNull(pick(item, "barcode")),
        name,
        description:       toStringOrNull(pick(item, "description")),
        unit:              toStringOrNull(pick(item, "unit")),
        item_type:         "product",
        status:            isActive ? "active" : "inactive",
        currency:          "BRL",
        category_id:       categoryId,
        brand:             toStringOrNull(pick(item, "brand")),
        price:             toNumberOrNull(pick(item, "price")),
        promotional_price: toNumberOrNull(pick(item, "promotionalPrice", "promotional_price")),
        cost_price:        toNumberOrNull(pick(item, "costPrice", "cost_price")),
        stock_quantity:    stockQty,
        stock_available:   stockQty ?? 0,
        is_active:         isActive,
        is_available:      isAvailable,
        source_updated_at: toStringOrNull(pick(item, "sourceUpdatedAt", "source_updated_at")),
        last_synced_at:    now,
        raw_payload:       (pick(item, "rawPayload", "raw_data", "raw_payload") as Record<string, unknown>) ?? item,
        metadata:          { syncedBy: "shamar_agent", integrationSourceId, agentId },
      });
    }

    // ── 3. Batch upsert — uma única chamada ao banco ──
    let upserted = 0;
    let upsertError: string | null = null;

    if (payloads.length > 0) {
      const { error } = await supabase
        .from("catalog_items")
        .upsert(payloads, { onConflict: "organization_id,external_source,external_id" });

      if (error) {
        upsertError = error.message;
        console.error("[sync/catalog] Upsert falhou:", error);
      } else {
        upserted = payloads.length;
      }
    }

    // ── 4. Consolidar status ──
    const totalFailed = invalidCount + (upsertError ? payloads.length : 0);
    const status =
      upsertError
        ? "failed"
        : invalidCount > 0
          ? "partial_success"
          : "success";

    const finishedAt = new Date().toISOString();

    if (syncRunId) {
      await supabase
        .from("integration_sync_runs")
        .update({
          status,
          finished_at: finishedAt,
          items_received: items.length,
          items_created: upserted,   // upsert não distingue insert/update; usar items_created como proxy
          items_updated: 0,
          items_failed: totalFailed,
          error_message: upsertError
            ? `Upsert falhou: ${upsertError}`
            : invalidCount > 0
              ? `${invalidCount} item(ns) ignorados por falta de externalId ou name.`
              : null,
        })
        .eq("id", syncRunId);
    }

    await supabase.from("integration_sync_logs").insert({
      tenant_id: tenantId,
      organization_id: organizationId,
      integration_source_id: integrationSourceId,
      agent_id: agentId,
      sync_run_id: syncRunId,
      level: upsertError ? "error" : invalidCount > 0 ? "warning" : "info",
      message: "Sincronização de catálogo recebida do Shamar Agent.",
      context: { received: items.length, upserted, invalid: invalidCount, status, upsertError },
    });

    if (upsertError) {
      return NextResponse.json(
        { ok: false, error: `Upsert falhou: ${upsertError}`, syncRunId, received: items.length, upserted: 0, failed: totalFailed, status },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, syncRunId, received: items.length, upserted, accepted: upserted, failed: totalFailed, status });
  } catch (error) {
    if (supabase && syncRunId) {
      await supabase
        .from("integration_sync_runs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_message: "Erro interno durante a sincronização de catálogo.",
        })
        .eq("id", syncRunId);
    }
    if (error instanceof AgentAuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error("[sync/catalog] Erro interno:", error);
    return NextResponse.json({ ok: false, error: "Erro interno ao sincronizar catálogo do Shamar Agent." }, { status: 500 });
  }
}
