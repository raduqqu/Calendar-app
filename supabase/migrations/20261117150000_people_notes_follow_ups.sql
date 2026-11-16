-- Milestone 3: people, notes and follow-ups, plus two database functions that
-- save or delete a debrief in one step (all or nothing). Safe to run twice.

-- ---------------------------------------------------------------------------
-- people and their email addresses
-- ---------------------------------------------------------------------------
create table if not exists public.people (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  name         text not null check (length(trim(name)) between 1 and 200),
  organization text,
  role         text,
  about        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists people_user_idx on public.people (user_id);

create table if not exists public.person_emails (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid()
            references auth.users (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  email     text not null check (email = lower(trim(email)) and email like '%@%')
);
-- One address belongs to one person (per user).
create unique index if not exists person_emails_user_email_key
  on public.person_emails (user_id, email);
create index if not exists person_emails_person_idx
  on public.person_emails (person_id);

-- ---------------------------------------------------------------------------
-- who was at a meeting
-- ---------------------------------------------------------------------------
create table if not exists public.meeting_participants (
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  person_id  uuid not null references public.people (id) on delete cascade,
  user_id    uuid not null default auth.uid()
             references auth.users (id) on delete cascade,
  primary key (meeting_id, person_id)
);
create index if not exists meeting_participants_person_idx
  on public.meeting_participants (person_id);

-- ---------------------------------------------------------------------------
-- notes: one per meeting (or none, for a quick note about a person)
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid()
             references auth.users (id) on delete cascade,
  -- If a meeting is ever deleted, its note is kept as a quick note.
  meeting_id uuid references public.meetings (id) on delete set null,
  body       text not null default '' check (length(body) <= 20000),
  tone       text check (tone in ('warm', 'neutral', 'cold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists notes_meeting_key
  on public.notes (meeting_id) where meeting_id is not null;
create index if not exists notes_user_created_idx
  on public.notes (user_id, created_at desc);

-- who a note is about (used for every note)
create table if not exists public.note_people (
  note_id   uuid not null references public.notes (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  user_id   uuid not null default auth.uid()
            references auth.users (id) on delete cascade,
  primary key (note_id, person_id)
);
create index if not exists note_people_person_idx
  on public.note_people (person_id);

-- ---------------------------------------------------------------------------
-- follow-ups: things promised or to do, attached to a note.
-- person_id is set when the note is about exactly one person; otherwise the
-- follow-up belongs to everyone the note is about.
-- ---------------------------------------------------------------------------
create table if not exists public.follow_ups (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid()
             references auth.users (id) on delete cascade,
  note_id    uuid references public.notes (id) on delete cascade,
  person_id  uuid references public.people (id) on delete set null,
  text       text not null check (length(trim(text)) between 1 and 500),
  done       boolean not null default false,
  created_at timestamptz not null default now(),
  done_at    timestamptz
);
create index if not exists follow_ups_note_idx on public.follow_ups (note_id);
create index if not exists follow_ups_user_open_idx
  on public.follow_ups (user_id) where not done;

-- ---------------------------------------------------------------------------
-- Row-level security: everyone sees and changes only their own rows.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'people', 'person_emails', 'meeting_participants',
    'notes', 'note_people', 'follow_ups'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      t || '_select_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      t || '_insert_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || '_update_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      t || '_delete_own', t);

    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end;
$$;

-- keep updated_at current
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

drop trigger if exists people_set_updated_at on public.people;
create trigger people_set_updated_at
  before update on public.people
  for each row execute function public.set_updated_at();

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- save_debrief: saves a meeting's note, its people and follow-ups at once.
-- Runs as the signed-in user, so row-level security still applies.
--   p_existing_people: ids of people who already exist
--   p_new_people:      [{"name": "...", "email": "..." or null}] to create
--                      (an email already known reuses that person)
--   p_follow_ups:      [{"id": "..." or null, "text": "...", "done": false}]
-- ---------------------------------------------------------------------------
create or replace function public.save_debrief(
  p_meeting_id      uuid,
  p_body            text,
  p_tone            text,
  p_existing_people uuid[],
  p_new_people      jsonb,
  p_follow_ups      jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_note   uuid;
  v_people uuid[] := coalesce(p_existing_people, '{}');
  v_person uuid;
  v_item   jsonb;
  v_email  text;
  v_name   text;
  v_single uuid;
begin
  if v_user is null then
    raise exception 'Not signed in';
  end if;

  perform 1 from public.meetings where id = p_meeting_id and user_id = v_user;
  if not found then
    raise exception 'Meeting not found';
  end if;

  if exists (
    select 1 from unnest(v_people) as pid
    where not exists (
      select 1 from public.people p where p.id = pid and p.user_id = v_user
    )
  ) then
    raise exception 'Unknown person';
  end if;

  -- Create the new people (or reuse someone with the same email).
  for v_item in select * from jsonb_array_elements(coalesce(p_new_people, '[]'::jsonb))
  loop
    v_name := trim(coalesce(v_item ->> 'name', ''));
    v_email := nullif(lower(trim(coalesce(v_item ->> 'email', ''))), '');
    v_person := null;
    if v_email is not null then
      select person_id into v_person
      from public.person_emails
      where user_id = v_user and email = v_email;
    end if;
    if v_person is null then
      if v_name = '' then
        raise exception 'A new person needs a name';
      end if;
      insert into public.people (user_id, name)
      values (v_user, v_name)
      returning id into v_person;
      if v_email is not null then
        insert into public.person_emails (user_id, person_id, email)
        values (v_user, v_person, v_email);
      end if;
    end if;
    v_people := array_append(v_people, v_person);
  end loop;

  select coalesce(array_agg(distinct pid), '{}') into v_people
  from unnest(v_people) as pid;
  if cardinality(v_people) = 1 then
    v_single := v_people[1];
  end if;

  -- Who was at the meeting
  delete from public.meeting_participants
  where meeting_id = p_meeting_id and user_id = v_user;
  insert into public.meeting_participants (meeting_id, person_id, user_id)
  select p_meeting_id, pid, v_user from unnest(v_people) as pid;

  -- The note itself
  insert into public.notes (user_id, meeting_id, body, tone)
  values (v_user, p_meeting_id, coalesce(p_body, ''), p_tone)
  on conflict (meeting_id) where meeting_id is not null
  do update set body = excluded.body, tone = excluded.tone
  returning id into v_note;

  -- Who the note is about
  delete from public.note_people where note_id = v_note and user_id = v_user;
  insert into public.note_people (note_id, person_id, user_id)
  select v_note, pid, v_user from unnest(v_people) as pid;

  -- Follow-ups: remove the ones no longer listed, update the rest, add new.
  delete from public.follow_ups f
  where f.note_id = v_note and f.user_id = v_user
    and not exists (
      select 1 from jsonb_array_elements(coalesce(p_follow_ups, '[]'::jsonb)) i
      where i ->> 'id' = f.id::text
    );

  for v_item in select * from jsonb_array_elements(coalesce(p_follow_ups, '[]'::jsonb))
  loop
    continue when trim(coalesce(v_item ->> 'text', '')) = '';
    if exists (
      select 1 from public.follow_ups f
      where f.id::text = v_item ->> 'id' and f.note_id = v_note and f.user_id = v_user
    ) then
      update public.follow_ups f
      set text = trim(v_item ->> 'text'),
          person_id = v_single,
          done = coalesce((v_item ->> 'done')::boolean, false),
          done_at = case
            when not coalesce((v_item ->> 'done')::boolean, false) then null
            when f.done then f.done_at
            else now()
          end
      where f.id::text = v_item ->> 'id';
    else
      insert into public.follow_ups (user_id, note_id, person_id, text, done, done_at)
      values (
        v_user, v_note, v_single, trim(v_item ->> 'text'),
        coalesce((v_item ->> 'done')::boolean, false),
        case when coalesce((v_item ->> 'done')::boolean, false) then now() end
      );
    end if;
  end loop;

  update public.meetings set status = 'debriefed'
  where id = p_meeting_id and user_id = v_user;

  return jsonb_build_object('note_id', v_note, 'people', cardinality(v_people));
end;
$$;

-- delete_debrief: removes a meeting's note (and its follow-ups) and marks the
-- meeting as waiting for a debrief again. The people stay.
create or replace function public.delete_debrief(p_meeting_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from public.notes
  where meeting_id = p_meeting_id and user_id = auth.uid();
  update public.meetings set status = 'open'
  where id = p_meeting_id and user_id = auth.uid();
end;
$$;

revoke all on function public.save_debrief(uuid, text, text, uuid[], jsonb, jsonb) from public, anon;
grant execute on function public.save_debrief(uuid, text, text, uuid[], jsonb, jsonb) to authenticated;
revoke all on function public.delete_debrief(uuid) from public, anon;
grant execute on function public.delete_debrief(uuid) to authenticated;
