-- Milestone 2b: calendars (which Google calendars to read) and meetings
-- (a local copy of calendar events, so notes stay linked even if an event
-- changes or is deleted in Google). Safe to run more than once.

-- Remember when the calendar was last read, so the app does not ask Google
-- on every single page load.
alter table public.profiles
  add column if not exists last_synced_at timestamptz;

-- ---------------------------------------------------------------------------
-- calendars
-- ---------------------------------------------------------------------------
create table if not exists public.calendars (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  provider    text not null default 'google' check (provider in ('google')),
  external_id text not null,
  name        text not null,
  is_primary  boolean not null default false,
  selected    boolean not null default false,
  time_zone   text,
  created_at  timestamptz not null default now()
);

create unique index if not exists calendars_user_provider_external_key
  on public.calendars (user_id, provider, external_id);

alter table public.calendars enable row level security;

drop policy if exists "calendars_select_own" on public.calendars;
create policy "calendars_select_own" on public.calendars
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "calendars_update_own" on public.calendars;
create policy "calendars_update_own" on public.calendars
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.calendars from anon, authenticated;
grant select, update on public.calendars to authenticated;
grant all on public.calendars to service_role;

-- ---------------------------------------------------------------------------
-- meetings
-- status: open | debriefed | skipped. "Upcoming" and "pending" are worked
-- out from the clock, not stored.
-- ---------------------------------------------------------------------------
create table if not exists public.meetings (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid()
                        references auth.users (id) on delete cascade,
  source                text not null check (source in ('google', 'manual')),
  calendar_id           uuid references public.calendars (id) on delete set null,
  external_event_id     text,
  title                 text not null,
  starts_at             timestamptz not null,
  ends_at               timestamptz not null,
  attendees             jsonb not null default '[]'::jsonb,
  status                text not null default 'open'
                        check (status in ('open', 'debriefed', 'skipped')),
  removed_from_calendar boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint meetings_end_after_start check (ends_at >= starts_at)
);

-- One row per calendar event (each occurrence of a repeating event has its
-- own id in Google, so each gets its own row).
create unique index if not exists meetings_user_calendar_event_key
  on public.meetings (user_id, calendar_id, external_event_id);

create index if not exists meetings_user_starts_at_idx
  on public.meetings (user_id, starts_at);

alter table public.meetings enable row level security;

drop policy if exists "meetings_select_own" on public.meetings;
create policy "meetings_select_own" on public.meetings
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "meetings_insert_own" on public.meetings;
create policy "meetings_insert_own" on public.meetings
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "meetings_update_own" on public.meetings;
create policy "meetings_update_own" on public.meetings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "meetings_delete_own" on public.meetings;
create policy "meetings_delete_own" on public.meetings
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.meetings from anon, authenticated;
grant select, insert, update, delete on public.meetings to authenticated;
grant all on public.meetings to service_role;

-- Keep updated_at current (the function was created in the first migration;
-- it is re-created here so this file also works on its own).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists meetings_set_updated_at on public.meetings;
create trigger meetings_set_updated_at
  before update on public.meetings
  for each row execute function public.set_updated_at();
