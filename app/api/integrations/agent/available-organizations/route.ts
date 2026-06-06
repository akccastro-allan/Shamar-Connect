import { NextRequest, NextResponse } from "next/server";

import { AgentAuthError, assertSetupToken } from "@/lib/integrations/agent-auth";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    assertSetupToken(request);

    const supabase = createSupabaseWriteClient();

    const { data: organizations, error: organizationsError } = await supabase
      .from("organizations")
      .select(
        "id, tenant_id, name, slug, business_type, industry, status, email, phone, whatsapp_phone, city, state",
      )
      .eq("status", "active")
      .order("name", { ascending: true });

    if (organizationsError) {
      throw organizationsError;
    }

    const tenantIds = Array.from(
      new Set((organizations || []).map((organization: any) => organization.tenant_id).filter(Boolean)),
    );

    let tenantsById = new Map<string, any>();

    if (tenantIds.length > 0) {
      const { data: tenants, error: tenantsError } = await supabase
        .from("tenants")
        .select("id, name, slug, status")
        .in("id", tenantIds);

      if (tenantsError) {
        throw tenantsError;
      }

      tenantsById = new Map((tenants || []).map((tenant: any) => [tenant.id, tenant]));
    }

    const responseOrganizations = (organizations || []).map((organization: any) => {
      const tenant = tenantsById.get(organization.tenant_id);

      return {
        tenantId: organization.tenant_id,
        tenantName: tenant?.name || null,
        organizationId: organization.id,
        organizationName: organization.name,
        slug: organization.slug,
        businessType: organization.business_type,
        industry: organization.industry,
        status: organization.status,
        city: organization.city,
        state: organization.state,
      };
    });

    return NextResponse.json({
      ok: true,
      organizations: responseOrganizations,
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
        error: "Erro interno ao listar organizações disponíveis para o Shamar Agent.",
      },
      { status: 500 },
    );
  }
}
