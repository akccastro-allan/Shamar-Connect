import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseWriteClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const password = String(body?.password || "");
    const accessToken = String(body?.accessToken || "");

    if (password.length < 8) {
      return NextResponse.json({ ok: false, error: "A senha deve ter no mínimo 8 caracteres." }, { status: 400 });
    }

    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "Link inválido ou expirado. Solicite uma nova recuperação de senha." }, { status: 400 });
    }

    const authClient = createSupabaseServerClient();
    const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return NextResponse.json({ ok: false, error: "Link inválido ou expirado. Solicite uma nova recuperação de senha." }, { status: 400 });
    }

    const adminClient = createSupabaseWriteClient();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userData.user.id, { password });

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao atualizar senha." }, { status: 500 });
  }
}
