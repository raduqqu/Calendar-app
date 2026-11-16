import { NextResponse, type NextRequest } from "next/server";
import { encryptToken } from "@/lib/crypto/tokens";
import { saveGoogleConnection } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";

/**
 * Google (through Supabase) sends the browser back here after sign-in, with
 * a one-time code in the address. We swap that code for a session, and keep
 * the Google refresh token: encrypted, on the server only.
 */
export async function GET(request: NextRequest) {
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/?error=${reason}`, request.url));

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  if (!code) {
    // The person pressed Cancel at Google, or Google reported a problem.
    console.error(
      "Sign-in returned without a code:",
      searchParams.get("error_description") ?? searchParams.get("error"),
    );
    return fail(searchParams.get("error") ? "denied" : "nocode");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    console.error("Could not complete sign-in:", error?.message);
    return fail("exchange");
  }

  const { session } = data;
  try {
    // Google only sends the refresh token at this exact moment, and
    // Supabase does not keep it, so this is the one chance to store it.
    const refreshToken = session.provider_refresh_token;
    await saveGoogleConnection({
      userId: session.user.id,
      email: session.user.email ?? null,
      encryptedRefreshToken: refreshToken ? encryptToken(refreshToken) : null,
    });
    if (!refreshToken) {
      console.warn("Google did not return a refresh token for this sign-in.");
    }
  } catch (cause) {
    // Signed in, but the calendar connection could not be saved (for example
    // the database tables are missing). Say so instead of failing silently.
    console.error("Signed in, but saving the Google connection failed:", cause);
    return NextResponse.redirect(
      new URL("/today?notice=calendar", request.url),
    );
  }

  return NextResponse.redirect(new URL("/today", request.url));
}
