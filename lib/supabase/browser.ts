import { createBrowserClient } from "@supabase/ssr";
import { assertSupabasePublicEnv, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

export function createSupabaseBrowserClient() {
  assertSupabasePublicEnv();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
