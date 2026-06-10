import { NextRequest, NextResponse } from "next/server";
import type { Provider } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_PROVIDER: Provider = "google";
const ALLOWED_PROVIDERS = new Set<Provider>(["google", "github", "azure"]);

function resolveProvider(value: string | null): Provider {
  if (value && AL