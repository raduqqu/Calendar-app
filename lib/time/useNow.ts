"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  const id = window.setInterval(onChange, 20_000);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", onChange);
  };
}

/** Current time rounded down to the minute, so screens re-draw once a minute. */
function getSnapshot(): number | null {
  return Math.floor(Date.now() / 60_000) * 60_000;
}

/** The server does not know the device's clock or time zone. */
function getServerSnapshot(): number | null {
  return null;
}

/**
 * The current time in milliseconds, refreshed every minute.
 * Returns null while the page is still being prepared on the server.
 */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
