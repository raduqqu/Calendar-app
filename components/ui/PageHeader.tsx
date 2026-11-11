import type { ReactNode } from "react";

/** The title block at the top of Inbox, People and Settings. */
export function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="pt-6 pb-4">
      <h1 className="text-title">{title}</h1>
      {children}
    </header>
  );
}

/** Small grey note used while screens still show sample data. */
export function SampleNote({ children }: { children: ReactNode }) {
  return (
    <p className="text-meta text-ink-secondary bg-subtle rounded-button mb-4 px-3 py-2">
      {children}
    </p>
  );
}
