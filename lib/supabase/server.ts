import { createClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

export function createSupabaseServerClient() {
  assertSupabasePublicEnv();
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
