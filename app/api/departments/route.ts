import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";

const CAN_MANAGE = new Set(["owner", "admin"]);

// Lista os departamentos (setores) da empresa logada.
export async function GET() {
  try {
    const ctx = await getRequiredAppContext();
    const db = createSupabaseWriteClient();

    const { data, error } = await db
      .from("departments")
      .select("id, name, color, is_active, created_at")
      .eq("tenant_id", ctx.tenantId)
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ ok: true, departments: data ?? [] });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao listar setores" }, { status: 500 });
  }
}

// Cria ou atualiza um departamento. Só owner/admin.
export async function POST(request: NextRequest) {
  try {
    const ctx = await getRequiredAppContext();
    if (!CAN_MANAGE.has(ctx.role)) {
      return NextResponse.json({ ok: false, error: "Apenas administradores podem gerenciar setores." }, { status: 403 });
    }

    const body = await request.json();
    const id = body?.id ? String(body.id) : null;
    const name = String(body?.name || "").trim();
    const color = String(body?.color || "#2ABFAB").trim();
    const isActive = body?.is_active === undefined ? true : Boolean(body.is_active);

    if (!name) return NextResponse.json({ ok: false, error: "Informe o nome do setor." }, { status: 400 });

    const db = createSupabaseWriteClient();
    const now = new Date().toISOString();

    if (id) {
      // Atualiza, garantindo o escopo da empresa.
      const { data, error } = await db
        .from("departments")
        .update({ name, color, is_active: isActive, updated_at: now })
        .eq("id", id)
        .eq("tenant_id", ctx.tenantId)
        .eq("organization_id", ctx.organizationId)
        .select("id, name, color, is_active")
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, department: data });
    }

    const { data, error } = await db
      .from("departments")
      .insert({
        tenant_id: ctx.tenantId,
        organization_id: ctx.organizationId,
        name,
        color,
        is_active: isActive,
        updated_at: now,
      })
      .select("id, name, color, is_active")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, department: data });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao salvar setor" }, { status: 500 });
  }
}
