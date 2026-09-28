import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/database.types";

let client: SupabaseClient<Database> | undefined;

export function db() {
  if (!client) {
    const env = supabaseEnv();
    client = createClient<Database>(env.url, env.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
