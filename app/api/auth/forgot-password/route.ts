import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { sendPasswordRecoveryEmail } from "@/lib/email/resend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ ok: false, error: "E-mail obrigatório." }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://shamarconnect.com.br";
    const supabase = createSupabaseWriteClient();

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${siteUrl}/auth/confirm`,
      },
    });

    if (error || !data?.properties?.hashed_token) {
      return NextResponse.json({ ok: false, error: error?.message ?? "Falha ao gerar link." }, { status: 400 });
    }

    const confirmUrl = `${siteUrl}/login/reset-password?token_hash=${data.properties.hashed_token}&type=recovery`;
    await sendPasswordRecoveryEmail(email, confirmUrl);

    // Always return ok=true to avoid user enumeration
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao enviar e-mail." }, { status: 500 });
  }
}
