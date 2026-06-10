import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_PROVIDER = "google";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const provider = requestUrl.searchParams.get("provider") || DEFAULT_PROVIDER;
  const next = requestUrl.searchParams.get("next") || "/dashboard";
  const callbackUrl = new URL("/api/auth/callback", requestUrl.origin);

  callbackUrl.searchParams.set("next", next);

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error || !data.url) {
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set("error", "Não foi possível iniciar o login com Supabase OAuth.");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(data.url);
}
