import Link from "next/link";
import { Fab } from "@/components/nav/Fab";
import { NavWithCount } from "@/components/nav/NavWithCount";
import { Logo } from "@/components/ui/Logo";
import { APP_NAME } from "@/lib/config";

/**
 * The frame around every signed-in screen:
 * a bottom tab bar on phones, a left sidebar on desktop, and the "+" button.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh md:pl-60">
      <aside className="border-border bg-surface fixed inset-y-0 left-0 hidden w-60 flex-col border-r p-4 md:flex">
        <Link
          href="/today"
          className="mb-6 flex min-h-11 items-center gap-2 px-2"
        >
          <Logo />
          <span className="text-section tracking-tight">
            {APP_NAME.toLowerCase()}
          </span>
        </Link>
        <nav aria-label="Main">
          <NavWithCount variant="side" />
        </nav>
      </aside>

      <main className="mx-auto w-full max-w-[480px] px-4 pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-16">
        {children}
      </main>

      <Fab />

      <nav
        aria-label="Main"
        className="border-border bg-surface/95 fixed inset-x-0 bottom-0 z-20 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <NavWithCount variant="bar" />
      </nav>
    </div>
  );
}
