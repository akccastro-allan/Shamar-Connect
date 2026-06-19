import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

const ALLOWED_CATEGORIES = ["whatsapp","crm","campanhas","ia","financeiro","acesso","outro"] as const;
const ALLOWED_PRIORITIES = ["low","normal","high","urgent"] as const;

type Category = typeof ALLOWED_CATEGORIES[number];
type Priority = typeof ALLOWED_PRIORITIES[number];

function isCategory(v: unknown): v is Category {
  return ALLOWED_CATEGORIES.includes(v as Category);
}
function isPriority(v: unknown): v is Priority {
  return ALLOWED_PRIORITIES.includes(v as Priority);
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getRequiredAppContext();
    const url = request.nextUrl;
    const status = url.searchParams.get("status") ?? undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);

    const db = createSupabaseWriteClient();
    let query = db
      .from("support_tickets")
      .select("id, title, category, priority, status, created_at, updated_at, created_by, description")
      .eq("tenant_id", ctx.tenantId)
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ ok: true, tickets: data ?? [] });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erro ao listar tickets" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getRequiredAppContext();
    const body = await request.json();

    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const category: Category = isCategory(body.category) ? body.category : "outro";
    const priority: Priority = isPriority(body.priority) ? body.priority : "normal";

    if (!title) return NextResponse.json({ ok: false, error: "Título é obrigatório." }, { status: 400 });
    if (!description) return NextResponse.json({ ok: false, error: "Descrição é obrigatória." }, { status: 400 });

    const db = createSupabaseWriteClient();
    const { data, error } = await db
      .from("support_tickets")
      .insert({
        tenant_id: ctx.tenantId,
        organization_id: ctx.organizationId,
        created_by: ctx.appUserId,
        title,
        description,
        category,
        priority,
        status: "open",
      })
      .select("id, title, category, priority, status, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, ticket: data }, { status: 201 });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erro ao criar ticket" }, { status: 500 });
  }
}
