import { connection } from "next/server";
import { cache, Suspense } from "react";
import { countPendingMeetings } from "@/lib/data/meetings";
import { NavLinks } from "./NavLinks";

/** Asked once per page load, even though two menus show the number. */
const pendingCount = cache(async (): Promise<number> => {
  await connection();
  try {
    return await countPendingMeetings();
  } catch (error) {
    // The badge is a nicety: never let it break the whole screen.
    console.error("Could not count pending debriefs:", error);
    return 0;
  }
});

async function Counted({ variant }: { variant: "bar" | "side" }) {
  return <NavLinks variant={variant} pendingCount={await pendingCount()} />;
}

/** The navigation, with the number of pending debriefs on the Inbox tab. */
export function NavWithCount({ variant }: { variant: "bar" | "side" }) {
  return (
    <Suspense fallback={<NavLinks variant={variant} pendingCount={0} />}>
      <Counted variant={variant} />
    </Suspense>
  );
}
