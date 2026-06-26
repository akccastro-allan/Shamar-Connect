/**
 * Cria os 4 departamentos padrão de clínica médica para uma organização.
 * Idempotente: não duplica se já existir dept com o mesmo nome.
 * Uso: POST { organizationId, tenantId }
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";

const CLINIC_DEPARTMENTS = [
  { name: "Agendamento", color: "#2ABFAB" },
  { name: "Financeiro",  color: "#C9952A" },
  { name: "Triagem",     color: "#1B2F5B" },
  { name: "Geral",       color: "#94a3b8" },
];

export async function POST(request: NextRequest) {
  try {
    const ctx = await getRequiredAppContext();
    if (ctx.role !== "owner" && ctx.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Acesso restrito a administradores." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const tenantId = String(body?.tenantId || "").trim();
    const organizationId = String(body?.organizationId || "").trim();

    if (!tenantId || !organizationId) {
      return NextResponse.json({ ok: false, error: "tenantId e organizationId são obrigatórios." }, { status: 400 });
    }

    const db = createSupabaseWriteClient();

    // Busca departamentos já existentes
    const { data: existing } = await db
      .from("departments")
      .select("name")
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId);

    const existingNames = new Set((existing || []).map((d: { name: string }) => d.name));

    const toCreate = CLINIC_DEPARTMENTS.filter((d) => !existingNames.has(d.name));

    if (toCreate.length === 0) {
      return NextResponse.json({ ok: true, created: [], message: "Departamentos já existem." });
    }

    const now = new Date().toISOString();
    const { data: created, error } = await db
      .from("departments")
      .insert(toCreate.map((d) => ({
        tenant_id: tenantId,
        organization_id: organizationId,
        name: d.name,
        color: d.color,
        is_active: true,
        created_at: now,
        updated_at: now,
      })))
      .select("id, name, color");

    if (error) throw error;

    return NextResponse.json({ ok: true, created });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao criar departamentos." }, { status: 500 });
  }
}
