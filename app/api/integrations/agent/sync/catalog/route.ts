import { NextRequest, NextResponse } from "next/server";

import { AgentAuthError, getAuthenticatedAgent, touchAgentSeen } from "@/lib/integrations/agent-auth";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export const dynamic = "force-dynamic";

const MAX_BATCH_SIZE = 500;

function normalizeSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toNumberOrNull(value: any): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const normalized = Number(value.replace(",", "."));
    return Number.isFinite(normalized) ? normalized : null;
  }
  return null;
}

function toStringOrNull(value: any): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number") return String(value);
  return null;
}

async function getOrCreateCategory(params: {
  supabase: any;
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
  let supabase: any = null;

  try {
    const body = await request.json().catch(() => ({} as any));
    const { agent, source } = await getAuthenticatedAgent(request);
    supabase = createSupabaseWriteClient();

    const items = Array.isArray(body?.items) ? body.items : null;

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

    const tenantId = (agent as any).tenant_id || (source as any).tenant_id;
    const organizationId = (agent as any).organization_id || (source as any).organization_id;
    const integrationSourceId = (source as any).id;
    const integrationAgentId = (agent as any).id;
    const externalSource = (source as any).source_type || "unknown";
    const startedAt = new Date().toISOString();

    await touchAgentSeen(integrationAgentId, request);

    const { data: syncRun, error: syncRunError } = await supabase
      .from("integration_sync_runs")
      .insert({
        tenant_id: tenantId,
        organization_id: organizationId,
        integration_source_id: integrationSourceId,
        integration_agent_id: integrationAgentId,
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
        const externalId = toStringOrNull(item?.externalId);
        const name = toStringOrNull(item?.name);

        if (!externalId || !name) {
          failed += 1;
          continue;
        }

        const categoryName = toStringOrNull(item?.category);
        const categoryId = categoryName
          ? await getOrCreateCategory({ supabase, tenantId, organizationId, externalSource, categoryName })
          : null;

        const catalogPayload: Record<string, any> = {
          external_source: externalSource,
          external_id: externalId,
          sku: toStringOrNull(item?.sku),
          barcode: toStringOrNull(item?.barcode),
          name,
          description: toStringOrNull(item?.description),
          item_type: "product",
          status: "active",
          currency: "BRL",
          category_id: categoryId,
          brand: toStringOrNull(item?.brand),
          price: toNumberOrNull(item?.price),
          stock_quantity: toNumberOrNull(item?.stockQuantity),
          image_url: toStringOrNull(item?.imageUrl),
          source_updated_at: toStringOrNull(item?.sourceUpdatedAt),
          last_synced_at: new Date().toISOString(),
          raw_payload: item?.rawPayload || item,
          metadata: { syncedBy: "shamar_agent", integrationSourceId, integrationAgentId },
        };

        const { data: existingItem, error: lookupError } = await supabase
          .from("catalog_items")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("external_source", externalSource)
          .eq("external_id", externalId)
          .limit(1)
          .maybeSingle();

        if (lookupError) throw lookupError;

        if (existingItem?.id) {
          const { error: updateError } = await supabase
            .from("catalog_items")
            .update(catalogPayload)
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
      integration_agent_id: integrationAgentId,
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

    return NextResponse.json(
      { ok: false, error: "Erro interno ao sincronizar catálogo do Shamar Agent." },
      { status: 500 },
    );
  }
}
