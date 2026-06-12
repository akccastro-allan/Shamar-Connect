import { NextRequest, NextResponse } from "next/server";
import type { Provider } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_PROVIDER: Provider = "google";
const ALLOWED_PROVIDERS = new Set<Provider>(["google", "github", "azure"]);

function resolveProvider(value: string | null): Provider {
  if (value && ALLOWED_PROVIDERS.has(value as Provider)) {
    return value as Provider;
  }

  return DEFAULT_PROVIDER;
}

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const provider = resolveProvider(searchParams.get("provider"));
  const next = normalizeNextPath(searchParams.get("next"));

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  return NextResponse.redirect(data.url);
}
