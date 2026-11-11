"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * A panel that slides up from the bottom on phones and sits in the middle on
 * desktop. Built on the browser's own <dialog>, which already handles the
 * Escape key, keeping keyboard focus inside, and screen-reader announcements.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // A click on the dimmed area outside the panel closes it.
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 id={titleId} className="text-section">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-ink-secondary hover:bg-subtle -mr-2 inline-flex size-11 items-center justify-center rounded-full"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
