import { NextResponse } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

export async function GET() {
  if (!supabaseUrl) {
    return NextResponse.json({ ok: false, service: "supabase", error: "NEXT_PUBLIC_SUPABASE_URL is not configured" }, { status: 500 });
  }

  if (!supabaseAnonKey) {
    return NextResponse.json({ ok: false, service: "supabase", error: "NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: supabaseAnonKey,
      },
      cache: "no-store",
    });

    return NextResponse.json({
      ok: response.ok,
      service: "supabase",
      url: supabaseUrl,
      status: response.status,
    }, { status: response.ok ? 200 : 500 });
  } catch (error) {
    return NextResponse.json({ ok: false, service: "supabase", error: error instanceof Error ? error.message : "Supabase connection failed" }, { status: 500 });
  }
}
