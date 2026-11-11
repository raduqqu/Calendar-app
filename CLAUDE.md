# Ply — project guide

This file is the single source of truth for how this project is built. Keep it updated whenever a decision changes.

> **Name:** the app is called **Ply** (the logo says "ply"; "Debrief" was the earlier placeholder). The name lives in exactly one place, `lib/config.ts` (`APP_NAME`), so it can be renamed in one edit.

## 1. Product summary

Ply is a calendar-linked "relationship memory" app for one person.

- It reads my Google Calendar (read-only).
- After each meeting it asks "how did it go?" and stores a short note against the people who were there.
- Before my next meeting with the same people it shows me what I noted last time.

**Success criteria for v1**

1. Logging a debrief takes under 30 seconds.
2. Before any meeting with someone I have met before, I see my past notes without searching.
3. It works on my phone like a native app (installed PWA with push notifications).

**Non-goals for v1:** no AI features or paid APIs, no writing to the calendar, no Outlook/Apple Calendar, no teams or sharing, no native app, no dark mode, no analytics or trackers.

**User:** single user (me). Every table row still belongs to a user and is protected by row-level security, so more users could be added later.

## 2. Core flows (short form)

| Flow                | What happens                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. First launch     | Landing → "Continue with Google" (calendar read-only) → 3 onboarding screens (notifications, times, install to home screen) → Today                   |
| B. After a meeting  | Push "How did it go with …?" → Debrief screen pre-filled → type or dictate → confirm people → Save. Dismissed = "Debrief pending" badge + Inbox entry |
| C. Evening check    | Push at chosen time (default 21:00) → Tomorrow view with people I have notes on highlighted                                                           |
| D. Before a meeting | Push N minutes before (default 15) → Prep card: last 3 notes, open follow-ups, last met. No notes on anyone = no notification                         |
| E. People           | Searchable list, profile with About, follow-ups, notes feed; edit, merge duplicates, quick note                                                       |
| F. Manual meeting   | "+" button → meeting with date, time, people and debrief                                                                                              |

## 3. Architecture

**Stack:** Next.js (App Router, TypeScript strict) · Tailwind CSS · Supabase (Google sign-in, Postgres, row-level security, `pg_cron`) · Vercel hosting · installable PWA with Web Push.

**How the pieces talk to each other**

```
Phone / browser (PWA)
   │  pages, server actions
   ▼
Next.js on Vercel ──────────────► Google Calendar API (read-only)
   │  lib/data (repository layer)        ▲
   ▼                                     │ uses stored refresh token
Supabase Postgres (RLS on every table)   │
   │                                     │
   └─ pg_cron: every few minutes calls ──┘
      POST /api/cron/tick on Vercel (protected by a shared secret)
      → sync calendar → decide which notifications are due → send Web Push
```

**Key decisions and why**

1. **UI never talks to the database directly.** All reads and writes go through `lib/data/*` (the repository layer). If we ever leave Supabase, only that folder changes.
2. **Calendar is behind an interface.** `lib/calendar/types.ts` defines `CalendarProvider`; `lib/calendar/google.ts` implements it. Outlook later = one new file.
3. **Scheduling runs on the server, triggered by Supabase `pg_cron`.** Vercel's free plan only allows a cron job once per day, which is useless for "15 minutes before a meeting". Supabase's built-in scheduler (`pg_cron` + `pg_net`) is free and can run every minute. It calls a protected route in our own Next.js app (`/api/cron/tick`).
   - _Why a Next.js route and not a Supabase Edge Function:_ all logic stays in one codebase and one language, and is covered by the same tests. Edge Functions run on a different runtime (Deno) and deploy separately — two things to maintain.
   - _Trade-off:_ notifications are accurate to the tick interval (about 1–2 minutes), not to the second. A free Supabase project can be paused after about a week with no activity; daily use and the cron itself keep it active, but if it is ever paused, notifications stop until it is resumed in the dashboard.
4. **Google refresh token is captured once, encrypted, and never reaches the browser.** Supabase does not keep it. At sign-in we request offline access, read `provider_refresh_token` in the server-side `/auth/callback` route, encrypt it (AES-256-GCM with `TOKEN_ENCRYPTION_KEY`) and store it in `google_tokens`. That table has RLS on and **no** policies, so only the server (service key) can read it.
5. **Notification rules are pure functions.** `lib/notifications/rules.ts` takes "now, settings, meetings, what was already sent" and returns "what to send". No database or clock inside, so it is easy to test (quiet hours, de-duplication, no-notes-no-prep).
6. **Times:** stored in UTC (`timestamptz`), displayed in the user's time zone (IANA name such as `Europe/Rome`, stored in the profile). All conversion goes through `lib/time/`.
7. **PWA:** hand-written service worker (`public/sw.js`) for push and an offline shell — no PWA plugin dependency. Offline = the app opens and shows the last pages it loaded, read-only.
8. **Voice:** browser Web Speech API only, feature-detected; mic button hidden when unsupported.
9. **Secrets** live only in server-side environment variables. Anything prefixed `NEXT_PUBLIC_` is visible to the browser, so only non-secret values get that prefix.

## 4. Folder structure

```
/
├─ CLAUDE.md                 this file
├─ README.md                 run locally, env vars, deploy
├─ .env.example              variable names only, no values
├─ vercel.json               tells Vercel this is a Next.js app (do not delete)
├─ docs/SETUP.md             click-by-click account setup
├─ app/
│  ├─ layout.tsx             fonts, global shell
│  ├─ globals.css            Tailwind + design tokens (@theme)
│  ├─ manifest.ts            PWA manifest
│  ├─ (marketing)/page.tsx   landing + "Continue with Google"
│  ├─ auth/callback/route.ts sign-in return; captures refresh token
│  ├─ onboarding/            3 onboarding screens
│  ├─ (app)/                 signed-in area with TabBar / sidebar
│  │  ├─ today/              timeline (also handles ?date=)
│  │  ├─ inbox/
│  │  ├─ people/  people/[id]/
│  │  ├─ meetings/[id]/debrief/   meetings/[id]/prep/
│  │  └─ settings/
│  └─ api/
│     ├─ cron/tick/route.ts  called by pg_cron; sync + notifications
│     ├─ push/subscribe/route.ts
│     └─ export/route.ts     JSON / CSV export
├─ components/
│  ├─ ui/                    Button, Card, Chip, Avatar, Sheet, StatusPill, EmptyState, PageHeader, Logo (later: Toast, TextAreaWithMic)
│  ├─ nav/                   NavLinks (tab bar + sidebar), Fab
│  ├─ timeline/              TodayView, DayHeader (title + week strip), Timeline, MeetingCard
│  ├─ inbox/  people/        InboxList, PeopleList
│  └─ notes/                 NoteCard, FollowUpList (later)
├─ lib/
│  ├─ config.ts              APP_NAME and other constants
│  ├─ supabase/              browser, server and admin clients
│  ├─ data/                  repository layer (people, meetings, notes, followUps, settings, push)
│  ├─ calendar/              types.ts (CalendarProvider), google.ts, filter.ts, sync.ts
│  ├─ matching/              attendee → person matching, name parsing
│  ├─ notifications/         rules.ts (pure), send.ts (web push)
│  ├─ time/                  date helpers, useNow hook (time zone helpers in milestone 2)
│  ├─ timeline/              layout.ts — where cards sit on the timeline (pure)
│  ├─ demo/                  sample data for milestone 1 only
│  ├─ types.ts               shared types (Meeting, PersonSummary, statuses)
│  ├─ crypto/                encrypt / decrypt refresh token
│  └─ speech/                Web Speech wrapper
├─ public/                   icons, sw.js
├─ supabase/migrations/      numbered SQL files — the only way the database changes
└─ tests/                    matching, notification rules, time zones
```

## 5. Database schema

All tables have row-level security on. Standard policy: `user_id = auth.uid()` for select/insert/update/delete. Every table (including join tables) carries `user_id` so the policy is the same simple rule everywhere. All ids are `uuid`, all times are `timestamptz` (UTC).

| Table                  | Columns                                                                                                                                                                                                                                                                                                     | Notes                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `profiles`             | `id` (= auth user id), `email`, `extra_emails text[]`, `time_zone`, `evening_check_time` (default 21:00), `prep_lead_minutes` (default 15), `quiet_start` (23:00), `quiet_end` (07:00), `dictation_lang` (`en`/`ro`/`it`), `include_solo_events` (false), `onboarding_done`, `google_connected`, timestamps | Profile + settings. Created automatically when a user signs up.                                                     |
| `google_tokens`        | `user_id` (PK), `refresh_token_encrypted`, `updated_at`                                                                                                                                                                                                                                                     | RLS on, **no policies**: server-only.                                                                               |
| `calendars`            | `id`, `user_id`, `provider` (`google`), `external_id`, `name`, `is_primary`, `selected`                                                                                                                                                                                                                     | Which calendars to sync (Settings).                                                                                 |
| `people`               | `id`, `user_id`, `name`, `organization`, `role`, `about`, timestamps                                                                                                                                                                                                                                        |                                                                                                                     |
| `person_emails`        | `id`, `user_id`, `person_id`, `email` (stored lowercase)                                                                                                                                                                                                                                                    | Unique on (`user_id`, `email`).                                                                                     |
| `meetings`             | `id`, `user_id`, `source` (`google`/`manual`), `calendar_id` (nullable), `external_event_id` (nullable), `title`, `starts_at`, `ends_at`, `attendees jsonb` (raw invite: email + display name), `status` (`open`/`debriefed`/`skipped`), `removed_from_calendar`, timestamps                                | Unique on (`user_id`, `calendar_id`, `external_event_id`). Each occurrence of a recurring event is its own row.     |
| `meeting_participants` | `meeting_id`, `person_id`, `user_id`                                                                                                                                                                                                                                                                        | People confirmed (or auto-matched by email) for a meeting.                                                          |
| `notes`                | `id`, `user_id`, `meeting_id` (nullable), `body`, `tone` (nullable: `warm`/`neutral`/`cold`), timestamps                                                                                                                                                                                                    | `meeting_id` null = quick note.                                                                                     |
| `note_people`          | `note_id`, `person_id`, `user_id`                                                                                                                                                                                                                                                                           | Who a note is about — used for **every** note.                                                                      |
| `follow_ups`           | `id`, `user_id`, `note_id` (nullable), `person_id`, `text`, `done`, `created_at`, `done_at`                                                                                                                                                                                                                 |                                                                                                                     |
| `push_subscriptions`   | `id`, `user_id`, `endpoint` (unique), `p256dh`, `auth`, `device_label`, `created_at`                                                                                                                                                                                                                        | One row per device.                                                                                                 |
| `notifications_log`    | `id`, `user_id`, `type` (`debrief`/`evening`/`prep`), `meeting_id` (nullable), `dedupe_key`, `sent_at`                                                                                                                                                                                                      | Unique on (`user_id`, `dedupe_key`), e.g. `prep:<meeting id>` or `evening:2026-11-11`. Makes duplicates impossible. |

**Changes from the originally suggested schema, and why**

1. **`profiles` instead of `users`.** Supabase already has its own built-in `auth.users` table. A separate `profiles` table avoids confusion and is the standard Supabase pattern.
2. **Meeting status is `open` / `debriefed` / `skipped` only.** "Upcoming" and "pending" are worked out from the clock (`open` + ended = pending; `open` + not ended = upcoming). Storing them would mean a background job has to flip them, and they would be wrong whenever it is late.
3. **`attendees` kept raw on the meeting.** Lets us suggest people from the invite before they exist in People, and re-match later if I add an email to someone.
4. **`note_people` is used for all notes, not only quick notes.** One simple query gives a person's full feed, and changing a meeting's participants later cannot silently rewrite which notes belong to whom.
5. **`calendars` table added** for the "choose calendars to sync" setting.
6. **`dedupe_key` on `notifications_log`.** The evening check has no meeting id, so a text key covers all three notification types with one uniqueness rule.
7. **`extra_emails` on the profile** so my other addresses are also excluded from attendees.

**Calendar sync rules**

- Scope `calendar.readonly` only. Never write.
- Window: 7 days back, 14 days ahead; refresh on app open and from the cron tick.
- Skip: all-day events, events I declined, events with no other attendees (unless `include_solo_events`), event types `focusTime` / `outOfOffice` / `workingLocation` / `birthday`, cancelled events.
- Drop attendees that are me, that are flagged as a resource, or whose email ends in `resource.calendar.google.com` / `group.calendar.google.com`.
- Event deleted in Google → keep the meeting and notes, set `removed_from_calendar = true`.
- Token refresh fails → set `google_connected = false` and show the "Reconnect Google Calendar" banner.

**Notification rules**

- Debrief prompt: a few minutes after `ends_at`, only if status is `open`. During quiet hours it waits until quiet hours end.
- Evening check: at `evening_check_time` in the user's time zone, summarising tomorrow.
- Prep: `prep_lead_minutes` before `starts_at`, only if at least one participant has a note.
- Never send the same type for the same meeting twice (`notifications_log`).

## 6. Design tokens

Defined once as Tailwind theme tokens in `app/globals.css` so dark mode can be added later. Components use token names, never raw hex values.

**Colors**

| Token                                       | Value                             | Use                                                              |
| ------------------------------------------- | --------------------------------- | ---------------------------------------------------------------- |
| `background`                                | `#FFFFFF`                         | Page background                                                  |
| `surface`                                   | `#FFFFFF`                         | Cards, sheets (with 1px `border`)                                |
| `border`                                    | `#E6ECF5`                         | Card and divider borders                                         |
| `subtle`                                    | `#F5F8FC`                         | Sections, input fields                                           |
| `primary`                                   | `#2563EB`                         | Buttons, active states, timeline line                            |
| `primary-hover`                             | `#1D4ED8`                         | Hover / pressed                                                  |
| `primary-light`                             | `#DBEAFE`                         | Selected chips, highlights, has-notes indicator                  |
| `ink`                                       | `#0F172A`                         | Primary text                                                     |
| `ink-secondary`                             | `#64748B`                         | Secondary text                                                   |
| `ink-tertiary`                              | `#94A3B8`                         | Placeholders only (too pale for readable text)                   |
| `success` / `success-light` / `success-ink` | `#16A34A` / `#DCFCE7` / `#166534` | Debriefed (pill = light background + dark text, for AA contrast) |
| `warning` / `warning-light` / `warning-ink` | `#F59E0B` / `#FEF3C7` / `#92400E` | Debrief pending (same pattern)                                   |
| `danger`                                    | `#DC2626`                         | Delete                                                           |

**Typography** — Inter via `next/font`, system sans-serif fallback. Body line height 1.5.

| Style         | Size / weight                 |
| ------------- | ----------------------------- |
| Page title    | 24px semibold                 |
| Section title | 17px semibold                 |
| Body          | 15px regular                  |
| Meta          | 13px                          |
| Tiny label    | 11px uppercase, letter-spaced |

**Shape and spacing** — 8px grid · cards 16px radius · buttons 12px radius · chips fully rounded · shadow `0 1px 2px rgba(15,23,42,0.06)` at most, rely on borders · tap targets at least 44px high.

**Icons and motion** — Lucide, 20px, stroke 1.75 · motion 150–250ms ease-out for sheets, toasts and the recording pulse · respect `prefers-reduced-motion`.

**Layout** — mobile-first. Desktop: centered column, max width 480px (People may use a wider two-column layout). Bottom tab bar on mobile (Today, Inbox with badge, People, Settings) becomes a left sidebar on desktop. Blue floating "+" button bottom right, above the tab bar.

**Accessibility** — AA contrast, visible focus rings, labels on every input and icon button.

**Reusable components** — Button (primary, secondary, ghost, danger), Card, Chip, Avatar (initials, blue-family colors), Sheet, Toast, Timeline, MeetingCard, NoteCard, EmptyState, TabBar, Fab, TextAreaWithMic.

## 7. Environment variables

Names only; values go in Vercel and in a local `.env.local` that is never committed.

| Variable                               | Secret? | What it is                                                             |
| -------------------------------------- | ------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | no      | Supabase project URL                                                   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | no      | Supabase public ("publishable" / "anon") key                           |
| `SUPABASE_SECRET_KEY`                  | **yes** | Supabase server ("secret" / "service role") key                        |
| `GOOGLE_CLIENT_ID`                     | no      | Google OAuth client id                                                 |
| `GOOGLE_CLIENT_SECRET`                 | **yes** | Google OAuth client secret (server uses it to refresh calendar access) |
| `TOKEN_ENCRYPTION_KEY`                 | **yes** | Random 32-byte key that encrypts the stored refresh token              |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`         | no      | Web Push public key                                                    |
| `VAPID_PRIVATE_KEY`                    | **yes** | Web Push private key                                                   |
| `VAPID_SUBJECT`                        | no      | `mailto:` contact address required by Web Push                         |
| `CRON_SECRET`                          | **yes** | Shared password that lets Supabase `pg_cron` call `/api/cron/tick`     |

## 8. Build order

1. Project setup, design tokens, layout shell with tab bar (static data).
2. Google sign-in and today's real calendar events on the timeline.
3. Manual debrief notes linked to meetings and participants.
4. People list and person profiles, attendee matching by email.
5. Inbox and pending-debrief logic.
6. PWA install and push notifications (post-meeting, evening check, pre-meeting).
7. Voice input.
8. Settings, data export, account deletion.
9. Final deploy checks and phone testing.

**Status**

- [x] 1. Layout shell with sample data (Today timeline, Inbox, People, Settings, tab bar / sidebar, "+" sheet). Sample data lives in `lib/demo/data.ts` and is deleted once real data replaces it.
- [ ] 2–9 not started.

**Product decisions (confirmed by the owner):** name "Ply"; new people are created when a debrief is saved, not on calendar sync; relationship tone is three tags (warm / neutral / cold); no debrief push for meetings with more than 10 attendees; 24-hour clock and day-month dates.

## 9. Technical notes

- **Next.js 16.** Its conventions differ from older versions. Read the bundled docs in `node_modules/next/dist/docs/` before using an API (see `AGENTS.md`, which Next.js maintains itself — leave it in place).
- Anything that reads the address bar (`searchParams`), cookies or other per-request data must sit inside a `<Suspense>` boundary, otherwise the build fails.
- The server does not know the device's clock. Screens that depend on "now" use the `useNow()` hook (`lib/time/useNow.ts`) and show a placeholder on first paint.
- Tailwind v4: tokens are in `app/globals.css` under `@theme`, there is no `tailwind.config` file. Text colours use the `ink` names (`text-ink`, `text-ink-secondary`).
- **Hosting:** production address is `https://calendar-app-ruddy-pi.vercel.app`; Vercel redeploys on every push to `main`. Vercel first detected the project as plain "Node" and failed with "No entrypoint found"; `vercel.json` with `{"framework": "nextjs"}` fixes that, so keep the file.
- **Git:** the assistant commits and pushes to `main` itself after each working step (owner approved).
- Checks before every commit: `npm run lint`, `npm run typecheck`, `npm run build`. Format with `npm run format`.
- Dependencies in use: `next`, `react`, `tailwindcss`, `lucide-react`, `prettier` (+ Tailwind plugin). Approved for milestone 2: `@supabase/supabase-js`, `@supabase/ssr`. Planned and awaiting the owner's OK: `web-push`, `vitest`.

## 10. Work rules for every session

- I (the owner) am not a professional developer. Explain every decision in plain language.
- One feature or system per task. Small changes, then I test.
- Before coding a milestone, state in 3–5 lines what will be built and which files will be touched.
- After each working feature, say exactly what to test and remind me to commit to Git with a suggested commit message.
- When I must do something myself (accounts, settings, dashboard clicks), give exact click-by-click instructions.
- Never make sweeping changes or large refactors without asking first.
- Ask before adding any new dependency; prefer well-known, maintained libraries.
- When something breaks, explain the cause in plain language before fixing it.
- Never put secrets in code or commit `.env` files. Keep `.env.example` current (names only).
- Database changes only as SQL files in `supabase/migrations/`, never dashboard-only edits.
- Keep this file updated when decisions change.
