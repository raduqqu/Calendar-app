"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Read-only access to the calendar. Ply never writes to it. */
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

/** The address this app is being served from, e.g. https://….vercel.app */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

/** Starts "Continue with Google": sends the browser to Google's sign-in page. */
export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await siteOrigin()}/auth/callback`,
      scopes: CALENDAR_SCOPE,
      queryParams: {
        // "offline" + "consent" make Google hand over a long-lived refresh
        // token, which the server needs to read the calendar while the app
        // is closed (for notifications).
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    console.error("Google sign-in could not start:", error?.message);
    redirect("/?error=start");
  }
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
