import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { canAccessCommandCenter, getTenantFeatureMetadata } from "@/lib/features/feature-flags";
import {
  buildInternalChannelMetadata,
  getInternalBusinessLabel,
  getNextInternalSessionId,
  INTERNAL_CHANNEL_PURPOSES,
  INTERNAL_CHANNEL_STATUSES,
  INTERNAL_CHANNEL_TYPES,
  INTERNAL_COMMUNITY_MODEL,
  INTERNAL_FEATURE_STAGE_CONFIG,
  INTERNAL_FEATURE_STAGES,
  INTERNAL_GROUP_MODEL,
  INTERNAL_SOCIAL_CONNECTION_MODEL,
  isAllowedInternalChannelType,
  isAllowedInternalFeatureStage,
  isAllowedInternalPurpose,
  isAllowedInternalStatus,
  isValidInternalWhatsappSessionId,
  makeInternalChannelSlug,
  PLANNED_INTERNAL_CHANNELS,
  resolveInternalBusinessKey,
  resolveProviderForInternalChannel,
  validateInternalSessionRegistration,
  type InternalChannelStatus,
} from "@/lib/operations/internal-channels";
import { getChannelGatewayId, publicGatewaySummary, type InternalGatewayRow } from "@/lib/operations/internal-gateways";

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
  gateway_id?: string | null;
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

const createChannelSchema = z.object({
  organizationId: z.string().uuid(),
  gatewayId: z.string().uuid().optional(),
  accountLabel: z.string().trim().min(2).max(80),
  channelType: z.enum(INTERNAL_CHANNEL_TYPES),
  purpose: z.enum(INTERNAL_CHANNEL_PURPOSES),
  status: z.enum(INTERNAL_CHANNEL_STATUSES).default("draft"),
  featureStage: z.enum(INTERNAL_FEATURE_STAGES).default("internal_alpha"),
  sessionId: z.string().trim().optional(),
  externalAccountId: z.string().trim().max(120).optional(),
});

const updateChannelSchema = z.object({
  channelId: z.string().uuid(),
  active: z.boolean(),
});

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

function channelSummary(channel: ChannelRow, organization: OrganizationRow, gatewayById: Map<string, InternalGatewayRow>) {
  const businessKey = resolveInternalBusinessKey(organization);
  const metadata = channel.metadata && typeof channel.metadata === "object" && !Array.isArray(channel.metadata)
    ? channel.metadata as Record<string, unknown>
    : {};
  const metadataPurpose = typeof metadata.purpose === "string" ? metadata.purpose : null;
  const metadataStage = typeof metadata.featureStage === "string" ? metadata.featureStage : null;
  const metadataLabel = typeof metadata.accountLabel === "string" ? metadata.accountLabel : null;
  const gatewayId = getChannelGatewayId(channel);
  const lastEventAt = typeof metadata.lastEventAt === "string" ? metadata.lastEventAt : null;
  const lastError = typeof metadata.lastError === "string" ? metadata.lastError : null;
  const sessionId = channel.session_id;

  return {
    id: channel.id,
    organizationId: channel.organization_id,
    businessKey,
    businessLabel: businessKey ? getInternalBusinessLabel(businessKey) : organization.name,
    channelType: channel.channel_type || metadata.channelType || channel.provider || "whatsapp_web",
    accountLabel: metadataLabel || channel.display_name || channel.name,
    displayName: channel.display_name || channel.name,
    sessionId,
    gatewayId,
    gatewayName: gatewayId ? gatewayById.get(gatewayId)?.name || gatewayId : null,
    externalAccountId: metadata.externalAccountId || channel.phone_number_id || channel.external_instance || null,
    purpose: metadataPurpose || "other",
    status: normalizeStatus(channel.status, channel.is_active ?? channel.active),
    featureStage: metadataStage || "internal_alpha",
    active: channel.is_active ?? channel.active ?? false,
    inboxUrl: sessionId ? `/whatsapp-messages?channelId=${channel.id}` : `/whatsapp-messages`,
    originContext: {
      business: businessKey ? getInternalBusinessLabel(businessKey) : organization.name,
      channel: channel.channel_type || metadata.channelType || channel.provider || "whatsapp_web",
      account: sessionId || metadata.externalAccountId || channel.display_name || channel.name,
      sessionId,
      gateway: gatewayId,
      purpose: metadataPurpose || "other",
    },
    lastEventAt,
    lastError,
    createdAt: channel.created_at,
    updatedAt: channel.updated_at,
  };
}

function existingSessions(channels: ChannelRow[]) {
  return channels.map((channel) => ({
    sessionId: channel.session_id,
    gatewayId: getChannelGatewayId(channel),
  }));
}

async function loadInternalGateways(db: ReturnType<typeof createSupabaseWriteClient>, tenantId: string) {
  const { data, error } = await db
    .from("internal_messaging_gateways")
    .select("id, tenant_id, name, slug, provider, base_url, environment, status, version, max_sessions, last_health_check_at, last_error, metadata, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) throw error;
  return (data || []) as InternalGatewayRow[];
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
    const gateways = await loadInternalGateways(auth.db, auth.context.tenantId);
    const gatewayById = new Map(gateways.map((gateway) => [gateway.id, gateway]));
    const organizationIds = organizations.map((organization) => organization.id);

    if (!organizationIds.length) {
      return NextResponse.json({ ok: true, gateways: gateways.map((gateway) => publicGatewaySummary(gateway)), organizations: [], channels: [] });
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
        return organization ? channelSummary(channel as ChannelRow, organization, gatewayById) : null;
      })
      .filter(Boolean);
    const sessions = existingSessions((channels || []) as ChannelRow[]);

    return NextResponse.json({
      ok: true,
      gateways: gateways.map((gateway) => publicGatewaySummary(gateway, sessions.filter((session) => session.gatewayId === gateway.id).length)),
      organizations: organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        businessKey: organization.businessKey,
        businessLabel: getInternalBusinessLabel(String(organization.businessKey)),
        nextSessions: gateways.map((gateway) => {
          const next = getNextInternalSessionId({
            businessKey: organization.businessKey as NonNullable<typeof organization.businessKey>,
            gatewayId: gateway.id,
            existingSessions: sessions,
          });
          return { gatewayId: gateway.id, ...next };
        }),
      })),
      channels: safeChannels,
      plannedChannels: PLANNED_INTERNAL_CHANNELS,
      models: {
        groups: INTERNAL_GROUP_MODEL,
        communities: INTERNAL_COMMUNITY_MODEL,
        socialConnections: INTERNAL_SOCIAL_CONNECTION_MODEL,
      },
      featureStages: INTERNAL_FEATURE_STAGE_CONFIG,
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

    const parsed = createChannelSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Dados do canal interno inválidos." }, { status: 400 });
    }

    const { organizationId, accountLabel, channelType, purpose, status, featureStage } = parsed.data;
    const gatewayId = parsed.data.gatewayId || null;
    const externalAccountId = parsed.data.externalAccountId || null;
    if (!isAllowedInternalChannelType(channelType) || !isAllowedInternalPurpose(purpose) || !isAllowedInternalStatus(status) || !isAllowedInternalFeatureStage(featureStage)) {
      return NextResponse.json({ ok: false, error: "Finalidade, status ou estágio inválido." }, { status: 400 });
    }
    const organizations = await loadInternalOrganizations(auth.db, auth.context.tenantId);
    const organization = organizations.find((item) => item.id === organizationId);
    if (!organization?.businessKey) {
      return NextResponse.json({ ok: false, error: "Empresa não pertence ao Centro de Comando interno." }, { status: 403 });
    }

    const gateways = await loadInternalGateways(auth.db, auth.context.tenantId);
    const gateway = gatewayId ? gateways.find((item) => item.id === gatewayId) : null;
    if (channelType === "whatsapp_web" && !gateway) {
      return NextResponse.json({ ok: false, error: "Gateway interno real é obrigatório para WhatsApp Web interno." }, { status: 400 });
    }

    const { data: existingChannels, error: existingError } = await auth.db
      .from("channels")
      .select("id, tenant_id, organization_id, name, slug, provider, provider_type, channel_type, display_name, session_id, gateway_id, phone_number, phone_number_id, external_instance, status, active, is_active, metadata, created_at, updated_at")
      .eq("tenant_id", auth.context.tenantId)
      .eq("organization_id", organizationId);
    if (existingError) throw existingError;

    let sessionId: string | null = null;
    if (channelType === "whatsapp_web") {
      const sessions = existingSessions((existingChannels || []) as ChannelRow[]);
      if (parsed.data.sessionId && !isValidInternalWhatsappSessionId(parsed.data.sessionId, organization.businessKey)) {
        return NextResponse.json({ ok: false, error: "WhatsApp Web interno exige session ID no padrão <empresa>-01 até <empresa>-09." }, { status: 400 });
      }
      const nextSession = parsed.data.sessionId
        ? { ok: true as const, sessionId: parsed.data.sessionId }
        : getNextInternalSessionId({ businessKey: organization.businessKey, gatewayId: gatewayId!, existingSessions: sessions });
      if (!nextSession.ok) return NextResponse.json({ ok: false, error: nextSession.error }, { status: 400 });

      const registration = validateInternalSessionRegistration({
        businessKey: organization.businessKey,
        gatewayId: gatewayId!,
        sessionId: nextSession.sessionId,
        existingSessions: sessions,
      });
      if (!registration.ok) return NextResponse.json({ ok: false, error: registration.error }, { status: 400 });
      sessionId = nextSession.sessionId;
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
      gatewayId: channelType === "whatsapp_web" ? gatewayId : null,
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
        gateway_id: channelType === "whatsapp_web" ? gatewayId : null,
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

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireCommandCenterApi();
    if (!auth.ok) return auth.response;

    const parsed = updateChannelSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Dados de atualização inválidos." }, { status: 400 });
    }

    const { data: channel, error: channelError } = await auth.db
      .from("channels")
      .select("id, tenant_id, organization_id, metadata")
      .eq("tenant_id", auth.context.tenantId)
      .eq("id", parsed.data.channelId)
      .maybeSingle();
    if (channelError) throw channelError;
    if (!channel) return NextResponse.json({ ok: false, error: "Canal interno não encontrado." }, { status: 404 });

    const organizations = await loadInternalOrganizations(auth.db, auth.context.tenantId);
    if (!organizations.some((organization) => organization.id === channel.organization_id)) {
      return NextResponse.json({ ok: false, error: "Canal não pertence a uma empresa interna." }, { status: 403 });
    }

    const { error } = await auth.db
      .from("channels")
      .update({
        active: parsed.data.active,
        is_active: parsed.data.active,
        status: parsed.data.active ? "draft" : "disabled",
      })
      .eq("tenant_id", auth.context.tenantId)
      .eq("id", parsed.data.channelId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao atualizar canal interno." }, { status: 500 });
  }
}
