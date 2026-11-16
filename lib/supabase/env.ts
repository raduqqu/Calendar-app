/**
 * Reads the Supabase settings from environment variables and fails with a
 * clear message if one is missing (instead of a confusing crash later).
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. See docs/SETUP.md, Part 7.`,
    );
  }
  return value;
}

// These two are public by design (the NEXT_PUBLIC_ prefix): the browser
// needs them. Row-level security is what protects the data.
export const supabaseUrl = () =>
  required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);

export const supabasePublishableKey = () =>
  required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

/** Server only. This key bypasses row-level security. */
export const supabaseSecretKey = () =>
  required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
