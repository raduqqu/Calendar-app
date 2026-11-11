"use client";

import { CalendarDays, Inbox, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDemoPending } from "@/lib/demo/data";
import { useNow } from "@/lib/time/useNow";

const items = [
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/people", label: "People", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="bg-warning text-ink text-tiny inline-flex min-w-[18px] items-center justify-center rounded-full px-1 leading-[18px] font-semibold">
      {count > 99 ? "99+" : count}
      <span className="sr-only"> pending debriefs</span>
    </span>
  );
}

/**
 * The four main destinations. Shown as a bottom tab bar on phones
 * ("bar") and as a vertical list in the desktop sidebar ("side").
 */
export function NavLinks({ variant }: { variant: "bar" | "side" }) {
  const pathname = usePathname();
  const now = useNow();
  // Sample data for now; the real count comes from the database in milestone 5.
  const pendingCount = now === null ? 0 : getDemoPending(now).length;

  return (
    <ul className={variant === "bar" ? "flex" : "flex flex-col gap-1"}>
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const badge = href === "/inbox" ? pendingCount : 0;

        if (variant === "bar") {
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`text-tiny flex min-h-14 flex-col items-center justify-center gap-0.5 font-medium transition-colors duration-150 ${active ? "text-primary" : "text-ink-secondary"}`}
              >
                <span className="relative">
                  <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                  <span className="absolute -top-1.5 left-3.5">
                    <Badge count={badge} />
                  </span>
                </span>
                {label}
              </Link>
            </li>
          );
        }

        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`rounded-button text-body flex min-h-11 items-center gap-3 px-3 font-medium transition-colors duration-150 ${active ? "bg-primary-light text-primary-hover" : "text-ink-secondary hover:bg-subtle hover:text-ink"}`}
            >
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              <span className="flex-1">{label}</span>
              <Badge count={badge} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
