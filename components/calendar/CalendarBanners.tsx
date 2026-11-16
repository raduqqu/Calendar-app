import { signInWithGoogle } from "@/app/auth/actions";
import { Button } from "@/components/ui/Button";

/** Shown when Ply can no longer read the calendar. */
export function ReconnectBanner() {
  return (
    <div
      role="alert"
      className="rounded-card bg-warning-light text-warning-ink mt-4 p-4"
    >
      <p className="text-body font-semibold">Reconnect Google Calendar</p>
      <p className="text-meta mt-1">
        Ply can no longer read your calendar. Sign in again and make sure the
        box for calendar access is ticked.
      </p>
      <form action={signInWithGoogle}>
        <Button type="submit" size="sm" className="mt-3">
          Reconnect
        </Button>
      </form>
    </div>
  );
}

/** Shown when reading the calendar failed for a temporary reason. */
export function SyncFailedNote() {
  return (
    <p className="text-meta text-ink-secondary bg-subtle rounded-button mt-4 px-3 py-2">
      Could not refresh your calendar just now. Showing the meetings saved
      earlier.
    </p>
  );
}
