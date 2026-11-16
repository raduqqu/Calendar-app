-- Milestone 4: a summary of each person for the People list, and two
-- functions that edit or merge people in one step. Safe to run twice.

-- ---------------------------------------------------------------------------
-- people_overview: one row per person with their emails, when they were last
-- met, and how many notes they have. security_invoker makes the view obey
-- row-level security, so everyone only sees their own people.
-- ---------------------------------------------------------------------------
create or replace view public.people_overview
with (security_invoker = true) as
select
  p.id,
  p.user_id,
  p.name,
  p.organization,
  p.role,
  coalesce(
    (select array_agg(e.email order by e.email)
       from public.person_emails e
      where e.person_id = p.id),
    '{}'::text[]
  ) as emails,
  (select max(m.starts_at)
     from public.meeting_participants mp
     join public.meetings m on m.id = mp.meeting_id
    where mp.person_id = p.id
      and m.starts_at <= now()) as last_met_at,
  (select max(n.created_at)
     from public.note_people np
     join public.notes n on n.id = np.note_id
    where np.person_id = p.id) as last_note_at,
  (select count(*)::int
     from public.note_people np
    where np.person_id = p.id) as note_count
from public.people p;

revoke all on public.people_overview from anon, authenticated;
grant select on public.people_overview to authenticated;
grant all on public.people_overview to service_role;

-- ---------------------------------------------------------------------------
-- update_person: saves a person's details and their list of email addresses.
-- Fails with EMAIL_TAKEN:<address> if an address belongs to someone else.
-- ---------------------------------------------------------------------------
create or replace function public.update_person(
  p_person_id    uuid,
  p_name         text,
  p_organization text,
  p_role         text,
  p_about        text,
  p_emails       text[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_emails text[];
  v_taken  text;
begin
  if v_user is null then
    raise exception 'Not signed in';
  end if;

  update public.people
  set name         = trim(p_name),
      organization = nullif(trim(coalesce(p_organization, '')), ''),
      role         = nullif(trim(coalesce(p_role, '')), ''),
      about        = nullif(trim(coalesce(p_about, '')), '')
  where id = p_person_id and user_id = v_user;
  if not found then
    raise exception 'Person not found';
  end if;

  select coalesce(array_agg(distinct lower(trim(e))), '{}'::text[])
  into v_emails
  from unnest(coalesce(p_emails, '{}'::text[])) as e
  where trim(e) <> '';

  select pe.email into v_taken
  from public.person_emails pe
  where pe.user_id = v_user
    and pe.email = any (v_emails)
    and pe.person_id <> p_person_id
  limit 1;
  if v_taken is not null then
    raise exception 'EMAIL_TAKEN:%', v_taken;
  end if;

  delete from public.person_emails
  where person_id = p_person_id and user_id = v_user
    and email <> all (v_emails);

  insert into public.person_emails (user_id, person_id, email)
  select v_user, p_person_id, e from unnest(v_emails) as e
  on conflict (user_id, email) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- merge_people: moves everything from a duplicate (p_remove) onto the person
-- being kept (p_keep), then deletes the duplicate. All or nothing.
-- ---------------------------------------------------------------------------
create or replace function public.merge_people(p_keep uuid, p_remove uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_remove public.people%rowtype;
begin
  if v_user is null then
    raise exception 'Not signed in';
  end if;
  if p_keep = p_remove then
    raise exception 'Cannot merge a person with themselves';
  end if;

  perform 1 from public.people where id = p_keep and user_id = v_user;
  if not found then
    raise exception 'Person not found';
  end if;
  select * into v_remove from public.people
  where id = p_remove and user_id = v_user;
  if not found then
    raise exception 'Person not found';
  end if;

  update public.person_emails set person_id = p_keep
  where person_id = p_remove and user_id = v_user;

  insert into public.meeting_participants (meeting_id, person_id, user_id)
  select meeting_id, p_keep, v_user
  from public.meeting_participants
  where person_id = p_remove and user_id = v_user
  on conflict do nothing;

  insert into public.note_people (note_id, person_id, user_id)
  select note_id, p_keep, v_user
  from public.note_people
  where person_id = p_remove and user_id = v_user
  on conflict do nothing;

  update public.follow_ups set person_id = p_keep
  where person_id = p_remove and user_id = v_user;

  -- Keep the kept person's details; fill gaps from the duplicate.
  update public.people
  set organization = coalesce(organization, v_remove.organization),
      role         = coalesce(role, v_remove.role),
      about        = nullif(
                       concat_ws(
                         E'\n\n',
                         nullif(trim(coalesce(about, '')), ''),
                         nullif(trim(coalesce(v_remove.about, '')), '')
                       ),
                       ''
                     )
  where id = p_keep and user_id = v_user;

  -- Deleting the duplicate also removes its old meeting and note links.
  delete from public.people where id = p_remove and user_id = v_user;
end;
$$;

revoke all on function public.update_person(uuid, text, text, text, text, text[]) from public, anon;
grant execute on function public.update_person(uuid, text, text, text, text, text[]) to authenticated;
revoke all on function public.merge_people(uuid, uuid) from public, anon;
grant execute on function public.merge_people(uuid, uuid) to authenticated;
