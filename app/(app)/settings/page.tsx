import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AccountSection,
  AccountSectionPlaceholder,
} from "@/components/settings/AccountSection";
import { Card } from "@/components/ui/Card";
import { PageHeader, SampleNote } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Settings" };

/** The planned settings with their default values. Editing arrives in step 8. */
const sections: { title: string; rows: { label: string; value: string }[] }[] =
  [
    {
      title: "Notifications",
      rows: [
        { label: "Evening check", value: "21:00" },
        { label: "Reminder before a meeting", value: "15 minutes" },
        { label: "Quiet hours", value: "23:00 – 07:00" },
        { label: "Time zone", value: "Automatic" },
      ],
    },
    {
      title: "Calendar",
      rows: [
        { label: "Calendars to sync", value: "Primary" },
        { label: "Include solo events", value: "Off" },
      ],
    },
    {
      title: "Dictation",
      rows: [{ label: "Language", value: "English" }],
    },
    {
      title: "Data",
      rows: [
        { label: "Export all my data", value: "JSON · CSV" },
        { label: "Delete account and data", value: "" },
      ],
    },
  ];

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <SampleNote>
        Your account is live. The other settings are a preview and become
        editable in step 8.
      </SampleNote>
      <div className="flex flex-col gap-6">
        {sections.map((section) => (
          <section key={section.title} aria-labelledby={`s-${section.title}`}>
            <h2
              id={`s-${section.title}`}
              className="text-tiny text-ink-secondary mb-2 px-1 font-semibold uppercase"
            >
              {section.title}
            </h2>
            <Card>
              <dl className="divide-border divide-y">
                {section.rows.map((row) => (
                  <div
                    key={row.label}
                    className="flex min-h-12 items-center justify-between gap-4 px-4 py-2"
                  >
                    <dt className="text-body">{row.label}</dt>
                    <dd className="text-body text-ink-secondary text-right">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          </section>
        ))}
        <Suspense fallback={<AccountSectionPlaceholder />}>
          <AccountSection />
        </Suspense>
      </div>
    </>
  );
}
