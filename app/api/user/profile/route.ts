import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function GET() {
  try {
    const context = await getRequiredAppContext();
    const db = createSupabaseWriteClient();

    const { data: user, error } = await db
      .from("app_users")
      .select("id, name, email, avatar_url")
      .eq("id", context.appUserId)
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erro ao buscar perfil" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const body = await request.json();
    const db = createSupabaseWriteClient();

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof body.name === "string" && body.name.trim()) {
      patch.name = body.name.trim();
    }
    if (typeof body.avatar_url === "string") {
      patch.avatar_url = body.avatar_url || null;
    }

    const { data: user, error } = await db
      .from("app_users")
      .update(patch)
      .eq("id", context.appUserId)
      .select("id, name, email, avatar_url")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erro ao atualizar perfil" }, { status: 500 });
  }
}
