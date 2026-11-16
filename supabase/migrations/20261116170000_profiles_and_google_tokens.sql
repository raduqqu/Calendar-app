-- Milestone 2a: profiles (settings) and google_tokens (encrypted calendar access).
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- profiles: one row per user, holding their settings.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text,
  extra_emails        text[]      not null default '{}',
  time_zone           text,
  evening_check_time  time        not null default '21:00',
  prep_lead_minutes   integer     not null default 15
                      check (prep_lead_minutes between 0 and 240),
  quiet_start         time        not null default '23:00',
  quiet_end           time        not null default '07:00',
  dictation_lang      text        not null default 'en'
                      check (dictation_lang in ('en', 'ro', 'it')),
  include_solo_events boolean     not null default false,
  onboarding_done     boolean     not null default false,
  google_connected    boolean     not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A signed-in user may read and change only their own profile.
-- Creating and deleting profiles is done by the system, not by users.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke all on public.profiles from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

-- ---------------------------------------------------------------------------
-- google_tokens: the encrypted Google refresh token.
-- Row-level security is ON and there are NO policies, so no user (and no
-- browser) can read it. Only the server, using the secret key, can.
-- ---------------------------------------------------------------------------
create table if not exists public.google_tokens (
  user_id                 uuid primary key references auth.users (id) on delete cascade,
  refresh_token_encrypted text        not null,
  updated_at              timestamptz not null default now()
);

alter table public.google_tokens enable row level security;

revoke all on public.google_tokens from anon, authenticated;
grant all on public.google_tokens to service_role;

-- ---------------------------------------------------------------------------
-- Keep updated_at current whenever a profile changes.
-- ---------------------------------------------------------------------------
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

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Create the profile automatically when someone signs up.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
