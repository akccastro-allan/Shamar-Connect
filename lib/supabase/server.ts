import { createClient } from "@supabase/supabase-js";
import {
  assertSupabaseAdminEnv,
  assertSupabasePublicEnv,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/env";

export function createSupabaseServerClient() {
  assertSupabasePublicEnv();
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createSupabaseWriteClient() {
  assertSupabaseAdminEnv();
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
