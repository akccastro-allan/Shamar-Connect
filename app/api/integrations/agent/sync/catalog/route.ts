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

/** Aceita camelCase OU snake_case — retorna o primeiro que não for nulo/undefined */
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

  const { data: existingCategory, error: lookupError } = await supabase
    .from("catalog_categories")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("external_source", externalSource)
    .eq("external_id", externalId)
    .limit(1)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existingCategory?.id) return existingCategory.id;

  const { data: createdCategory, error: createError } = await supabase
    .from("catalog_categories")
    .insert({
      tenant_id: tenantId,
      organization_id: organizationId,
      external_source: externalSource,
      external_id: externalId,
      name,
      slug: externalId,
      status: "active",
      metadata: { createdBy: "shamar_agent_sync" },
    })
    .select("id")
    .single();

  if (createError) throw createError;
  return createdCategory?.id || null;
}

export async function POST(request: NextRequest) {
  let syncRunId: string | null = null;
  let supabase: ReturnType<typeof createSupabaseWriteClient> | null = null;

  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const { agent, source } = await getAuthenticatedAgent(request);
    supabase = createSupabaseWriteClient();

    const items = Array.isArray(body?.items) ? (body.items as Record<string, unknown>[]) : null;

    if (!items) {
      return NextResponse.json(
        { ok: false, error: "Payload inválido. O campo items deve ser um array." },
        { status: 400 },
      );
    }

    if (items.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { ok: false, error: `Lote acima do limite permitido de ${MAX_BATCH_SIZE} itens.` },
        { status: 400 },
      );
    }

    const tenantId = (agent as Record<string, unknown>).tenant_id || (source as Record<string, unknown>).tenant_id;
    const organizationId = (agent as Record<string, unknown>).organization_id || (source as Record<string, unknown>).organization_id;
    const integrationSourceId = (source as Record<string, unknown>).id;
    const agentId = (agent as Record<string, unknown>).id;
    const externalSource = (source as Record<string, unknown>).source_type || "unknown";
    const startedAt = new Date().toISOString();

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

    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const item of items) {
      try {
        // Aceita camelCase OU snake_case
        const externalId = toStringOrNull(pick(item, "externalId", "external_id"));
        const name = toStringOrNull(pick(item, "name"));

        if (!externalId || !name) { failed += 1; continue; }

        const categoryName = toStringOrNull(pick(item, "category"));
        const categoryId = categoryName
          ? await getOrCreateCategory({
              supabase,
              tenantId: tenantId as string,
              organizationId: organizationId as string,
              externalSource: externalSource as string,
              categoryName,
            })
          : null;

        const isActive   = toBoolOrDefault(pick(item, "isActive", "is_active"), true);
        const isAvailable = toBoolOrDefault(pick(item, "isAvailable", "is_available"), true);
        const stockQty   = toNumberOrNull(pick(item, "stockQuantity", "stock_quantity"));

        const catalogPayload: Record<string, unknown> = {
          external_source: externalSource,
          external_id: externalId,
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
          stock_available:   stockQty,
          is_active:         isActive,
          is_available:      isAvailable,
          // Não gravar imagens/BLOB nesta fase
          source_updated_at: toStringOrNull(pick(item, "sourceUpdatedAt", "source_updated_at")),
          last_synced_at:    new Date().toISOString(),
          raw_payload:       (pick(item, "rawPayload", "raw_data", "raw_payload") as Record<string, unknown>) ?? item,
          metadata:          { syncedBy: "shamar_agent", integrationSourceId, agentId },
        };

        const { data: existingItem, error: lookupError } = await supabase
          .from("catalog_items")
          .select("id")
          .eq("organization_id", organizationId as string)
          .eq("external_source", externalSource as string)
          .eq("external_id", externalId)
          .limit(1)
          .maybeSingle();

        if (lookupError) throw lookupError;

        if (existingItem?.id) {
          const { error: updateError } = await supabase
            .from("catalog_items")
            .update({ ...catalogPayload, updated_at: new Date().toISOString() })
            .eq("id", existingItem.id);
          if (updateError) throw updateError;
          updated += 1;
        } else {
          const { error: insertError } = await supabase.from("catalog_items").insert({
            tenant_id: tenantId,
            organization_id: organizationId,
            ...catalogPayload,
          });
          if (insertError) throw insertError;
          created += 1;
        }
      } catch {
        failed += 1;
      }
    }

    const status = failed === 0 ? "success" : failed < items.length ? "partial_success" : "failed";
    const finishedAt = new Date().toISOString();

    if (syncRunId) {
      await supabase
        .from("integration_sync_runs")
        .update({
          status,
          finished_at: finishedAt,
          items_received: items.length,
          items_created: created,
          items_updated: updated,
          items_failed: failed,
          error_message: failed > 0 ? `${failed} item(ns) falharam durante a sincronização.` : null,
        })
        .eq("id", syncRunId);
    }

    await supabase.from("integration_sync_logs").insert({
      tenant_id: tenantId,
      organization_id: organizationId,
      integration_source_id: integrationSourceId,
      agent_id: agentId,
      sync_run_id: syncRunId,
      level: failed > 0 ? "warning" : "info",
      message: "Sincronização de catálogo recebida do Shamar Agent.",
      context: { received: items.length, created, updated, failed, status },
    });

    return NextResponse.json({ ok: true, syncRunId, received: items.length, created, updated, failed, status });
  } catch (error) {
    if (supabase && syncRunId) {
      await supabase
        .from("integration_sync_runs")
        .update({ status: "failed", finished_at: new Date().toISOString(), error_message: "Erro interno durante a sincronização de catálogo." })
        .eq("id", syncRunId);
    }
    if (error instanceof AgentAuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Erro interno ao sincronizar catálogo do Shamar Agent." }, { status: 500 });
  }
}
