import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every page request. It does two jobs:
 *  1. keeps the sign-in session fresh (sessions expire and get renewed here);
 *  2. sends people to the right place: signed-out visitors cannot open the
 *     app screens, and signed-in visitors skip the landing page.
 */

/** Screens that need a signed-in user. */
const PROTECTED = [
  "/today",
  "/inbox",
  "/people",
  "/settings",
  "/meetings",
  "/onboarding",
];

type PendingCookie = Parameters<NextResponse["cookies"]["set"]>;

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const pendingCookies: PendingCookie[] = [];
  const pendingHeaders: Record<string, string> = {};
  let signedIn = false;

  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value, options } of cookiesToSet) {
            // Let the page being rendered right now see the fresh session…
            request.cookies.set(name, value);
            // …and remember to send it back to the browser too.
            pendingCookies.push([name, value, options]);
          }
          Object.assign(pendingHeaders, headers);
        },
      },
    });

    // Checks the session and renews it when it is about to expire.
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims);
  }

  const { pathname } = request.nextUrl;
  const needsUser = PROTECTED.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  let response: NextResponse;
  if (!signedIn && needsUser) {
    response = NextResponse.redirect(new URL("/", request.url));
  } else if (signedIn && pathname === "/") {
    response = NextResponse.redirect(new URL("/today", request.url));
  } else {
    response = NextResponse.next({ request });
  }

  for (const cookie of pendingCookies) response.cookies.set(...cookie);
  for (const [name, value] of Object.entries(pendingHeaders)) {
    response.headers.set(name, value);
  }
  return response;
}

export const config = {
  // Everything except static files, images and the sign-in return address.
  matcher: [
    "/((?!_next/static|_next/image|auth/callback|icon.svg|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
