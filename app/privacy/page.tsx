import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Privacy" };

const UPDATED = "17 November 2026";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-section">{title}</h2>
      <div className="text-body text-ink-secondary mt-2 flex flex-col gap-3">
        {children}
      </div>
    </section>
  );
}

/** Public privacy policy. Google requires one before the app can be published. */
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-[640px] px-6 py-10">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2">
        <Logo />
        <span className="text-section tracking-tight">
          {APP_NAME.toLowerCase()}
        </span>
      </Link>

      <h1 className="text-title mt-6">Privacy policy</h1>
      <p className="text-meta text-ink-secondary mt-1">
        Last updated {UPDATED}
      </p>

      <Section title="What Ply is">
        <p>
          {APP_NAME} is a personal note-taking app. It reads your Google
          Calendar so it can ask you how a meeting went, and shows you your own
          notes before you meet the same people again.
        </p>
      </Section>

      <Section title="What data Ply uses">
        <p>
          <strong className="text-ink">Your Google account:</strong> your name
          and email address, used only to sign you in.
        </p>
        <p>
          <strong className="text-ink">Your Google Calendar, read-only:</strong>{" "}
          the title, time and attendees (names and email addresses) of your
          events from 7 days ago to 14 days ahead. {APP_NAME} can never create,
          change or delete calendar events.
        </p>
        <p>
          <strong className="text-ink">What you write:</strong> the notes,
          follow-ups and details about people that you enter yourself.
        </p>
      </Section>

      <Section title="How it is used">
        <p>
          Your data is used only to show you your own meetings and notes and to
          send you reminders about them. It is not sold, not shared with anyone,
          not used for advertising, and not used to train AI models. There are
          no analytics or third-party trackers.
        </p>
        <p>
          {APP_NAME}&apos;s use and transfer of information received from Google
          APIs adheres to the{" "}
          <a
            className="text-primary underline"
            href="https://developers.google.com/terms/api-services-user-data-policy"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
      </Section>

      <Section title="Where it is stored">
        <p>
          Data is stored in a Supabase database in the European Union (Ireland),
          and the app is hosted on Vercel. Access is protected so that each
          account can only read its own data. The permission that lets{" "}
          {APP_NAME} read your calendar is stored encrypted and is never sent to
          your browser.
        </p>
      </Section>

      <Section title="Removing your data">
        <p>
          You can withdraw {APP_NAME}&apos;s access to your calendar at any time
          at{" "}
          <a
            className="text-primary underline"
            href="https://myaccount.google.com/permissions"
          >
            myaccount.google.com/permissions
          </a>
          . Deleting your account in {APP_NAME} removes all of your data.
        </p>
      </Section>
    </main>
  );
}
