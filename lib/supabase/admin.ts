import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseSecretKey, supabaseUrl } from "./env";

/**
 * Supabase client with the SECRET key. It bypasses row-level security, so
 * it is used only on the server and only where a user must not have access
 * themselves (for example the encrypted Google token).
 * Never import this from a component that runs in the browser.
 */
export function createAdminClient() {
  return createClient(supabaseUrl(), supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
