import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function GET() {
  try {
    const context = await getRequiredAppContext();

    if ((context.role !== "owner" && context.role !== "admin") || !context.isPlatformTenant) {
      return NextResponse.json({ ok: false, error: "Acesso restrito a administradores." }, { status: 403 });
    }

    const db = createSupabaseWriteClient();

    const { data: tenants, error } = await db
      .from("tenants")
      .select(`
        id, name, slug, owner_name, owner_email, status, created_at,
        organizations(id, name, status),
        tenant_users(id, role, status, app_users(id, name, email, status))
      `)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    return NextResponse.json({ ok: true, clients: tenants || [] });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao carregar clientes." },
      { status: 500 },
    );
  }
}
