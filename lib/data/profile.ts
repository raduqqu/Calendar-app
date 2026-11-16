import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createUserClient } from "@/lib/supabase/server";

/** The signed-in user's profile and settings, as the screens use them. */
export interface Profile {
  id: string;
  email: string | null;
  timeZone: string | null;
  eveningCheckTime: string;
  prepLeadMinutes: number;
  quietStart: string;
  quietEnd: string;
  dictationLang: "en" | "ro" | "it";
  includeSoloEvents: boolean;
  onboardingDone: boolean;
  googleConnected: boolean;
}

interface ProfileRow {
  id: string;
  email: string | null;
  time_zone: string | null;
  evening_check_time: string;
  prep_lead_minutes: number;
  quiet_start: string;
  quiet_end: string;
  dictation_lang: "en" | "ro" | "it";
  include_solo_events: boolean;
  onboarding_done: boolean;
  google_connected: boolean;
}

const COLUMNS =
  "id, email, time_zone, evening_check_time, prep_lead_minutes, quiet_start, quiet_end, dictation_lang, include_solo_events, onboarding_done, google_connected";

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    timeZone: row.time_zone,
    eveningCheckTime: row.evening_check_time,
    prepLeadMinutes: row.prep_lead_minutes,
    quietStart: row.quiet_start,
    quietEnd: row.quiet_end,
    dictationLang: row.dictation_lang,
    includeSoloEvents: row.include_solo_events,
    onboardingDone: row.onboarding_done,
    googleConnected: row.google_connected,
  };
}

/** The current user's profile, or null when nobody is signed in. */
export async function getMyProfile(): Promise<Profile | null> {
  const supabase = await createUserClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(COLUMNS)
    .eq("id", auth.user.id)
    .maybeSingle<ProfileRow>();
  if (error) throw new Error(`Could not load profile: ${error.message}`);

  // The profile row is created at sign-up. If it is somehow missing, still
  // show who is signed in rather than an error.
  return data
    ? toProfile(data)
    : {
        id: auth.user.id,
        email: auth.user.email ?? null,
        timeZone: null,
        eveningCheckTime: "21:00:00",
        prepLeadMinutes: 15,
        quietStart: "23:00:00",
        quietEnd: "07:00:00",
        dictationLang: "en",
        includeSoloEvents: false,
        onboardingDone: false,
        googleConnected: false,
      };
}

type Admin = ReturnType<typeof createClient>;

/**
 * Called by the server right after a successful Google sign-in.
 * Makes sure the profile exists and, when Google handed us a refresh
 * token, stores it (already encrypted) and marks the calendar as connected.
 *
 * Uses the secret key because the token table is closed to users.
 */
export async function saveGoogleConnection(input: {
  userId: string;
  email: string | null;
  encryptedRefreshToken: string | null;
  admin?: Admin;
}): Promise<void> {
  const admin = input.admin ?? createAdminClient();

  if (input.encryptedRefreshToken) {
    const { error } = await admin.from("google_tokens").upsert({
      user_id: input.userId,
      refresh_token_encrypted: input.encryptedRefreshToken,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Could not save Google token: ${error.message}`);
  }

  const profile: Record<string, unknown> = {
    id: input.userId,
    email: input.email,
  };
  if (input.encryptedRefreshToken) profile.google_connected = true;

  const { error } = await admin.from("profiles").upsert(profile);
  if (error) throw new Error(`Could not save profile: ${error.message}`);
}
