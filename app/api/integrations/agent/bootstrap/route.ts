import { NextRequest, NextResponse } from "next/server";

import {
  AgentAuthError,
  assertSetupToken,
  createAgentToken,
  hashSecret,
} from "@/lib/integrations/agent-auth";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export const dynamic = "force-dynamic";

function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (process.env.VERCEL_URL) {
    const vercelUrl = process.env.VERCEL_URL.replace(/^https?:\/\//, "");
    return `https://${vercelUrl}`;
  }

  return "";
}

function validateRequiredFields(body: any): string[] {
  const requiredFields = [
    "tenantId",
    "organizationId",
    "sourceType",
    "sourceName",
    "machineName",
    "operatingSystem",
    "agentName",
    "agentVersion",
  ];

  return requiredFields.filter((field) => {
    const value = body?.[field];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as any));

    assertSetupToken(request, typeof body?.setupToken === "string" ? body.setupToken : undefined);

    const missingFields = validateRequiredFields(body);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Campos obrigatórios ausentes.",
          fields: missingFields,
        },
        { status: 400 },
      );
    }

    const tenantId = body.tenantId.trim();
    const organizationId = body.organizationId.trim();
    const sourceType = body.sourceType.trim();
    const sourceName = body.sourceName.trim();
    const machineName = body.machineName.trim();
    const operatingSystem = body.operatingSystem.trim();
    const agentName = body.agentName.trim();
    const agentVersion = body.agentVersion.trim();

    const supabase = createSupabaseWriteClient();

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name, slug, status")
      .eq("id", tenantId)
      .limit(1)
      .maybeSingle();

    if (tenantError) {
      throw tenantError;
    }

    if (!tenant) {
      return NextResponse.json(
        {
          ok: false,
          error: "Tenant não encontrado.",
        },
        { status: 400 },
      );
    }

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("id, tenant_id, name, slug, status")
      .eq("id", organizationId)
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle();

    if (organizationError) {
      throw organizationError;
    }

    if (!organization) {
      return NextResponse.json(
        {
          ok: false,
          error: "Organização não encontrada para o tenant informado.",
        },
        { status: 400 },
      );
    }

    const { data: existingSource, error: sourceLookupError } = await supabase
      .from("integration_sources")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId)
      .eq("source_type", sourceType)
      .eq("name", sourceName)
      .limit(1)
      .maybeSingle();

    if (sourceLookupError) {
      throw sourceLookupError;
    }

    let source = existingSource as any;

    if (!source) {
      const { data: createdSource, error: createSourceError } = await supabase
        .from("integration_sources")
        .insert({
          tenant_id: tenantId,
          organization_id: organizationId,
          source_type: sourceType,
          name: sourceName,
          status: "active",
          metadata: {
            createdBy: "shamar_agent_bootstrap",
            machineName,
            operatingSystem,
          },
        })
        .select("*")
        .single();

      if (createSourceError) {
        throw createSourceError;
      }

      source = createdSource as any;
    }

    const agentToken = createAgentToken();
    const agentTokenHash = hashSecret(agentToken);

    const { data: agent, error: createAgentError } = await supabase
      .from("integration_agents")
      .insert({
        tenant_id: tenantId,
        organization_id: organizationId,
        integration_source_id: source.id,
        name: agentName,
        machine_name: machineName,
        operating_system: operatingSystem,
        agent_version: agentVersion,
        agent_token_hash: agentTokenHash,
        status: "active",
        metadata: {
          createdBy: "shamar_agent_bootstrap",
          tenantName: (tenant as any).name || null,
          organizationName: (organization as any).name || null,
        },
      })
      .select("*")
      .single();

    if (createAgentError) {
      throw createAgentError;
    }

    await supabase.from("integration_sync_logs").insert({
      tenant_id: tenantId,
      organization_id: organizationId,
      integration_source_id: source.id,
      integration_agent_id: (agent as any).id,
      level: "info",
      message: "Agente ativado via bootstrap do Shamar Agent.",
      context: {
        machineName,
        operatingSystem,
        agentVersion,
        sourceType,
        sourceName,
      },
    });

    return NextResponse.json({
      ok: true,
      tenantId,
      organizationId,
      integrationSourceId: source.id,
      agentId: (agent as any).id,
      agentToken,
      apiUrl: getApiUrl(),
    });
  } catch (error) {
    if (error instanceof AgentAuthError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Erro interno ao fazer bootstrap do Shamar Agent.",
      },
      { status: 500 },
    );
  }
}
