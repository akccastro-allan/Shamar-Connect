import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { canAccessCommandCenter, getTenantFeatureMetadata } from "@/lib/features/feature-flags";
import {
  buildInternalChannelMetadata,
  getInternalBusinessLabel,
  isAllowedInternalChannelType,
  isAllowedInternalFeatureStage,
  isAllowedInternalPurpose,
  isAllowedInternalStatus,
  isValidInternalWhatsappSessionId,
  makeInternalChannelSlug,
  resolveInternalBusinessKey,
  resolveProviderForInternalChannel,
  type InternalChannelStatus,
} from "@/lib/operations/internal-channels";

export const dynamic = "force-dynamic";

type OrganizationRow = {
  id: string;
  tenant_id: string;
  name: string;
  slug: string | null;
  metadata: unknown;
};

type ChannelRow = {
  id: string;
  tenant_id: string;
  organization_id: string;
  name: string;
  slug: string;
  provider: string | null;
  provider_type: string | null;
  channel_type: string | null;
  display_name: string | null;
  session_id: string | null;
  phone_number: string | null;
  phone_number_id: string | null;
  external_instance: string | null;
  status: string | null;
  active: boolean | null;
  is_active: boolean | null;
  metadata: unknown;
  created_at: string | null;
  updated_at: string | null;
};

async function requireCommandCenterApi() {
  const context = await getRequiredAppContext();
  const db = createSupabaseWriteClient();
  const metadata = await getTenantFeatureMetadata(db, context.tenantId);

  if (!canAccessCommandCenter(context, metadata)) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "Acesso restrito ao Centro de Comando." }, { status: 403 }) };
  }

  return { ok: true as const, context, db };
}

function normalizeStatus(status: string | null | undefined, active: boolean | null | undefined): InternalChannelStatus {
  if (active === false) return "disabled";
  if (status === "active") return "connected";
  if (status && isAllowedInternalStatus(status)) return status;
  return "draft";
}

function channelSummary(channel: ChannelRow, organization: OrganizationRow) {
  const businessKey = resolveInternalBusinessKey(organization);
  const metadata = channel.metadata && typeof channel.metadata === "object" && !Array.isArray(channel.metadata)
    ? channel.metadata as Record<string, unknown>
    : {};
  const metadataPurpose = typeof metadata.purpose === "string" ? metadata.purpose : null;
  const metadataStage = typeof metadata.featureStage === "string" ? metadata.featureStage : null;
  const metadataLabel = typeof metadata.accountLabel === "string" ? metadata.accountLabel : null;

  return {
    id: channel.id,
    tenantId: channel.tenant_id,
    organizationId: channel.organization_id,
    businessKey,
    businessLabel: businessKey ? getInternalBusinessLabel(businessKey) : organization.name,
    organizationName: organization.name,
    channelType: channel.channel_type || metadata.channelType || channel.provider || "whatsapp_web",
    provider: channel.provider,
    providerType: channel.provider_type,
    accountLabel: metadataLabel || channel.display_name || channel.name,
    displayName: channel.display_name || channel.name,
    sessionId: channel.session_id,
    externalAccountId: metadata.externalAccountId || channel.phone_number_id || channel.external_instance || null,
    purpose: metadataPurpose || "other",
    status: normalizeStatus(channel.status, channel.is_active ?? channel.active),
    featureStage: metadataStage || "internal_alpha",
    active: channel.is_active ?? channel.active ?? false,
    createdAt: channel.created_at,
    updatedAt: channel.updated_at,
  };
}

async function loadInternalOrganizations(db: ReturnType<typeof createSupabaseWriteClient>, tenantId: string) {
  const { data, error } = await db
    .from("organizations")
    .select("id, tenant_id, name, slug, metadata")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("name");

  if (error) throw error;

  return (data || [])
    .map((organization) => ({ ...organization, businessKey: resolveInternalBusinessKey(organization as OrganizationRow) }))
    .filter((organization) => organization.businessKey);
}

export async function GET() {
  try {
    const auth = await requireCommandCenterApi();
    if (!auth.ok) return auth.response;

    const organizations = await loadInternalOrganizations(auth.db, auth.context.tenantId);
    const organizationIds = organizations.map((organization) => organization.id);

    if (!organizationIds.length) {
      return NextResponse.json({ ok: true, organizations: [], channels: [] });
    }

    const { data: channels, error } = await auth.db
      .from("channels")
      .select("id, tenant_id, organization_id, name, slug, provider, provider_type, channel_type, display_name, session_id, phone_number, phone_number_id, external_instance, status, active, is_active, metadata, created_at, updated_at")
      .eq("tenant_id", auth.context.tenantId)
      .in("organization_id", organizationIds)
      .order("name");

    if (error) throw error;

    const organizationById = new Map(organizations.map((organization) => [organization.id, organization as OrganizationRow]));
    const safeChannels = (channels || [])
      .map((channel) => {
        const organization = organizationById.get(channel.organization_id);
        return organization ? channelSummary(channel as ChannelRow, organization) : null;
      })
      .filter(Boolean);

    return NextResponse.json({
      ok: true,
      organizations: organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        businessKey: organization.businessKey,
        businessLabel: getInternalBusinessLabel(String(organization.businessKey)),
      })),
      channels: safeChannels,
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao carregar canais internos." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCommandCenterApi();
    if (!auth.ok) return auth.response;

    const body = await request.json() as Record<string, unknown>;
    const organizationId = String(body.organizationId || "");
    const accountLabel = String(body.accountLabel || "").trim();
    const channelType = String(body.channelType || "");
    const purpose = String(body.purpose || "other");
    const status = String(body.status || "draft");
    const featureStage = String(body.featureStage || "internal_alpha");
    const sessionId = String(body.sessionId || "").trim() || null;
    const externalAccountId = String(body.externalAccountId || "").trim() || null;

    if (!organizationId || !accountLabel) {
      return NextResponse.json({ ok: false, error: "Empresa interna e nome de exibição são obrigatórios." }, { status: 400 });
    }
    if (!isAllowedInternalChannelType(channelType)) {
      return NextResponse.json({ ok: false, error: "Tipo de canal inválido." }, { status: 400 });
    }
    if (!isAllowedInternalPurpose(purpose) || !isAllowedInternalStatus(status) || !isAllowedInternalFeatureStage(featureStage)) {
      return NextResponse.json({ ok: false, error: "Finalidade, status ou estágio inválido." }, { status: 400 });
    }
    const organizations = await loadInternalOrganizations(auth.db, auth.context.tenantId);
    const organization = organizations.find((item) => item.id === organizationId);
    if (!organization?.businessKey) {
      return NextResponse.json({ ok: false, error: "Empresa não pertence ao Centro de Comando interno." }, { status: 403 });
    }

    if (channelType === "whatsapp_web" && (!sessionId || !isValidInternalWhatsappSessionId(sessionId, organization.businessKey))) {
      return NextResponse.json({ ok: false, error: "WhatsApp Web interno exige session ID no padrão <empresa>-01 até <empresa>-09." }, { status: 400 });
    }

    const { provider, providerType } = resolveProviderForInternalChannel(channelType);
    const baseSlug = makeInternalChannelSlug({ businessKey: String(organization.businessKey), channelType, accountLabel });
    const metadata = buildInternalChannelMetadata({
      businessKey: organization.businessKey,
      channelType,
      accountLabel,
      externalAccountId,
      purpose,
      featureStage,
    });

    const { data: existingSlugs } = await auth.db
      .from("channels")
      .select("slug")
      .eq("tenant_id", auth.context.tenantId)
      .eq("organization_id", organizationId)
      .like("slug", `${baseSlug}%`);
    const usedSlugs = new Set((existingSlugs || []).map((item) => item.slug));
    let slug = baseSlug;
    let suffix = 2;
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const { data, error } = await auth.db
      .from("channels")
      .insert({
        tenant_id: auth.context.tenantId,
        organization_id: organizationId,
        name: accountLabel,
        display_name: accountLabel,
        slug,
        session_id: sessionId || slug,
        provider,
        provider_type: providerType,
        channel_type: channelType,
        phone_number_id: channelType === "whatsapp_official" ? externalAccountId : null,
        external_instance: provider === "evolution" ? externalAccountId : null,
        status,
        active: status !== "disabled",
        is_active: status !== "disabled",
        color: "#2ABFAB",
        description: `Canal interno ${getInternalBusinessLabel(String(organization.businessKey))}`,
        metadata,
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, channelId: data.id }, { status: 201 });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao cadastrar canal interno." }, { status: 500 });
  }
}
