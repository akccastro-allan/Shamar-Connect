import { NextResponse } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

function isSupportedSupabasePublicKey(value: string) {
  return value.split(".").length === 3 || value.startsWith("sb_publishable_");
}

export async function GET() {
  if (!supabaseUrl) {
    return NextResponse.json({ ok: false, service: "supabase", error: "NEXT_PUBLIC_SUPABASE_URL is not configured" }, { status: 500 });
  }

  if (!supabaseAnonKey) {
    return NextResponse.json({ ok: false, service: "supabase", error: "NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured" }, { status: 500 });
  }

  if (!isSupportedSupabasePublicKey(supabaseAnonKey)) {
    return NextResponse.json({
      ok: false,
      service: "supabase",
      url: supabaseUrl,
      error: "NEXT_PUBLIC_SUPABASE_ANON_KEY must be a Supabase publishable key or legacy anon public JWT key.",
    }, { status: 500 });
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: {
        apikey: supabaseAnonKey,
        authorization: `Bearer ${supabaseAnonKey}`,
      },
      cache: "no-store",
    });

    return NextResponse.json({
      ok: response.ok,
      service: "supabase",
      url: supabaseUrl,
      status: response.status,
      keyType: supabaseAnonKey.startsWith("sb_publishable_") ? "publishable" : "legacy_anon_jwt",
      hint: response.ok ? "Supabase is reachable." : "Check if the publishable key is correct and saved in the Vercel Production environment.",
    }, { status: response.ok ? 200 : 500 });
  } catch (error) {
    return NextResponse.json({ ok: false, service: "supabase", error: error instanceof Error ? error.message : "Supabase connection failed" }, { status: 500 });
  }
}
