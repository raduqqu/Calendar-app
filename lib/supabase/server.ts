import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Supabase client for server code acting AS THE SIGNED-IN USER.
 * It carries the user's session cookie, so row-level security applies:
 * it can only see and change that user's own rows.
 */
export async function createClient() {
  // Wait for a real visitor request. Without this, Next.js may try to
  // prepare the page ahead of time, where a session check makes no sense.
  await connection();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Pages (unlike actions and route handlers) are not allowed to
          // write cookies. That is fine: proxy.ts refreshes the session.
        }
      },
    },
  });
}
