import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const next = requestUrl.searchParams.get("next") || "/dashboard";
  const callbackUrl = new URL("/api/auth/callback", requestUrl.origin);
  callbackUrl.searchParams.set("next", next);

  const supabase