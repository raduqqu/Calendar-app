"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * A short confirmation at the bottom of the screen ("Saved to 2 people.").
 * It disappears by itself and removes its trigger from the address bar, so a
 * page refresh does not show it again.
 */
export function Toast({
  message,
  removeParam,
}: {
  message: string;
  removeParam?: string;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (removeParam) {
      const url = new URL(window.location.href);
      url.searchParams.delete(removeParam);
      window.history.replaceState(window.history.state, "", url);
    }
    const timer = window.setTimeout(() => setVisible(false), 3000);
    return () => window.clearTimeout(timer);
  }, [removeParam]);

  if (!visible) return null;
  return (
    <div
      role="status"
      className="bg-ink text-body rounded-button fixed inset-x-4 bottom-[calc(80px+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-sm items-center gap-2 px-4 py-3 text-white shadow-lg md:bottom-8"
      style={{ animation: "sheet-in 200ms var(--ease-out-soft)" }}
    >
      <Check size={18} strokeWidth={2.25} aria-hidden="true" />
      {message}
    </div>
  );
}
