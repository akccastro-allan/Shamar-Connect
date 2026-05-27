import { createClient } from "@supabase/supabase-js";
import { assertSupabaseAdminEnv, supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase/env";

export function createSupabaseWriteClient() {
  assertSupabaseAdminEnv();
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
