import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseWriteClient } from "@/lib/supabase/server";
import { sendPasswordRecoveryEmail } from "@/lib/email/resend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ ok: false, error: "E-mail obrigatório." }, { status: 400 });
    }

    const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://www.shamarconnect.com.br").replace(/\/$/, "");
    const redirectTo = `${siteUrl}/login/reset-password`;
    const supabase = createSupabaseWriteClient();

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo,
      },
    });

    if (error || !data?.properties?.hashed_token) {
      const publicSupabase = createSupabaseServerClient();
      const { error: resetError } = await publicSupabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (resetError) {
        return NextResponse.json({ ok: false, error: resetError.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true });
    }

    const confirmUrl = `${siteUrl}/login/reset-password?token_hash=${data.properties.hashed_token}&type=recovery`;
    await sendPasswordRecoveryEmail(email, confirmUrl);

    // Always return ok=true to avoid user enumeration
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao enviar e-mail." }, { status: 500 });
  }
}
