import type { Metadata } from "next";
import { Suspense } from "react";
import { TodayView } from "@/components/timeline/TodayView";
import { isDateKey } from "@/lib/time";

export const metadata: Metadata = { title: "Today" };

type SearchParams = PageProps<"/today">["searchParams"];

/** Reads the chosen day from the address bar (/today?date=2026-11-12). */
async function SelectedDay({ searchParams }: { searchParams: SearchParams }) {
  const { date } = await searchParams;
  return <TodayView dateKey={isDateKey(date) ? date : null} />;
}

function Placeholder() {
  return (
    <div aria-busy="true" className="pt-4">
      <div className="bg-subtle h-8 w-56 rounded-lg" />
      <div className="bg-subtle rounded-card mt-6 h-64" />
    </div>
  );
}

export default function TodayPage({ searchParams }: PageProps<"/today">) {
  return (
    <Suspense fallback={<Placeholder />}>
      <SelectedDay searchParams={searchParams} />
    </Suspense>
  );
}
