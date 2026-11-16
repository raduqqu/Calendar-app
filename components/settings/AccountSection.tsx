import { signOut } from "@/app/auth/actions";
import { Card } from "@/components/ui/Card";
import { getMyProfile } from "@/lib/data/profile";

const labelClass =
  "text-tiny text-ink-secondary mb-2 px-1 font-semibold uppercase";
const rowClass = "flex min-h-12 items-center justify-between gap-4 px-4 py-2";

/** Who is signed in, whether Google Calendar is connected, and Sign out. */
export async function AccountSection() {
  const profile = await getMyProfile();

  return (
    <section aria-labelledby="s-account">
      <h2 id="s-account" className={labelClass}>
        Account
      </h2>
      <Card>
        <dl className="divide-border divide-y">
          <div className={rowClass}>
            <dt className="text-body shrink-0">Signed in as</dt>
            <dd className="text-body text-ink-secondary truncate text-right">
              {profile?.email ?? "Unknown"}
            </dd>
          </div>
          <div className={rowClass}>
            <dt className="text-body">Google Calendar</dt>
            <dd
              className={`text-body text-right ${profile?.googleConnected ? "text-success-ink" : "text-warning-ink"}`}
            >
              {profile?.googleConnected ? "Connected" : "Not connected"}
            </dd>
          </div>
        </dl>
        <form action={signOut} className="border-border border-t">
          <button
            type="submit"
            className="text-body text-danger hover:bg-subtle rounded-b-card flex min-h-12 w-full items-center px-4 text-left font-medium"
          >
            Sign out
          </button>
        </form>
      </Card>
    </section>
  );
}

export function AccountSectionPlaceholder() {
  return (
    <section aria-busy="true">
      <p className={labelClass}>Account</p>
      <div className="bg-subtle rounded-card h-36" />
    </section>
  );
}
