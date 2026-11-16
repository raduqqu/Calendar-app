-- Owner decision (2026-11-17): show every timed calendar event, including
-- events with no other attendees, so people can be added by hand in Ply.
-- Safe to run more than once.

alter table public.profiles
  alter column include_solo_events set default true;

-- Switch it on for existing accounts and read the calendar again on the
-- next page load, so the events that were left out appear.
update public.profiles
set include_solo_events = true,
    last_synced_at = null
where include_solo_events = false;
