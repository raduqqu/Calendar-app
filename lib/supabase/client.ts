import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "./env";

/** Supabase client for code that runs in the browser. */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabasePublishableKey());
}
