import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const body = await request.json();
    const currentPassword = String(body?.currentPassword || "").trim();
    const newPassword = String(body?.newPassword || "").trim();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ ok: false, error: "Senha atual e nova senha são obrigatórias." }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ ok: false, error: "A nova senha deve ter pelo menos 8 caracteres." }, { status: 400 });
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ ok: false, error: "A nova senha deve ser diferente da atual." }, { status: 400 });
    }

    const db = createSupabaseWriteClient();

    // Fetch email to validate current password
    const { data: appUser, error: userError } = await db
      .from("app_users")
      .select("email")
      .eq("id", context.appUserId)
      .single();

    if (userError || !appUser?.email) {
      return NextResponse.json({ ok: false, error: "Usuário não encontrado." }, { status: 404 });
    }

    // Validate current password via Supabase Auth
    const { error: signInError } = await db.auth.signInWithPassword({
      email: appUser.email,
      password: currentPassword,
    });

    if (signInError) {
      return NextResponse.json({ ok: false, error: "Senha atual incorreta." }, { status: 400 });
    }

    // Update password via admin API (no active Supabase session required)
    const { error: updateError } = await db.auth.admin.updateUserById(context.appUserId, {
      password: newPassword,
    });

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, message: "Senha alterada com sucesso." });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erro ao alterar senha" }, { status: 500 });
  }
}
