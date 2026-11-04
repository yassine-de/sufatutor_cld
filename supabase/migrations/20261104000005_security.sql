-- TA3LIM schema, part 5: row level security, grants, answer checking, storage buckets.
--
-- Access model
--   * Curriculum, translations, plans, avatars: readable by everyone (landing page / SEO).
--   * Content items and exercises: signed-in users, published only. exercises.loesung is never
--     readable by clients; answers are checked by submit_attempt() on the server side.
--   * Family data (children, progress, attempts, rewards, sessions): only the owning parent.
--   * Subscriptions and payments: owner can read; writes only via the service role.
--   * Admins (users.rolle = 'admin') can manage content, plans and avatars. They read
--     exercises.loesung through the service role in the admin area, not through the browser client.

-- ---------------------------------------------------------------------------
-- Helpers. SECURITY DEFINER so policies do not recurse into RLS-protected tables.
-- ---------------------------------------------------------------------------
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.users where id = (select auth.uid()) and rolle = 'admin')
$$;

create function public.owns_child(p_child uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.child_profiles
    where id = p_child and parent_user_id = (select auth.uid())
  )
$$;

revoke execute on function public.is_admin(), public.owns_child(uuid) from public, anon;
grant  execute on function public.is_admin(), public.owns_child(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.curricula          enable row level security;
alter table public.grades             enable row level security;
alter table public.subjects           enable row level security;
alter table public.chapters           enable row level security;
alter table public.topics             enable row level security;
alter table public.translations       enable row level security;
alter table public.content_items      enable row level security;
alter table public.exercises          enable row level security;
alter table public.users              enable row level security;
alter table public.avatars            enable row level security;
alter table public.child_profiles     enable row level security;
alter table public.progress           enable row level security;
alter table public.topic_progress     enable row level security;
alter table public.exercise_attempts  enable row level security;
alter table public.rewards            enable row level security;
alter table public.learning_sessions  enable row level security;
alter table public.plans              enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.payments           enable row level security;

-- ---------------------------------------------------------------------------
-- Public reference data: read for all, write for admins
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['curricula', 'grades', 'subjects', 'chapters', 'topics', 'translations'] loop
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_read', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t || '_admin_write', t);
  end loop;
end $$;

create policy avatars_read on public.avatars for select to anon, authenticated using (aktiv or public.is_admin());
create policy avatars_admin_write on public.avatars for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy plans_read on public.plans for select to anon, authenticated using (aktiv or public.is_admin());
create policy plans_admin_write on public.plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Learning content
-- ---------------------------------------------------------------------------
create policy content_items_read on public.content_items for select to authenticated
  using (status = 'veroeffentlicht' or public.is_admin());
create policy content_items_admin_write on public.content_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy exercises_read on public.exercises for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.content_items c where c.id = content_item_id and c.status = 'veroeffentlicht'));
create policy exercises_admin_write on public.exercises for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Column-level protection of the solution. If you add a column to exercises, grant it here.
revoke all on public.exercises from anon;
revoke select on public.exercises from authenticated;
grant select (id, content_item_id, reihenfolge, fragetyp, daten, punkte, created_at, updated_at)
  on public.exercises to authenticated;

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------
create policy users_read_own on public.users for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy users_update_own on public.users for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- A user may edit only harmless profile fields: never rolle or telefon (phone changes go through auth).
revoke insert, update, delete on public.users from anon, authenticated;
grant update (anzeigename, email, sprache) on public.users to authenticated;

create policy child_profiles_own on public.child_profiles for all to authenticated
  using (parent_user_id = (select auth.uid()))
  with check (parent_user_id = (select auth.uid()));
create policy child_profiles_admin_read on public.child_profiles for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Family learning data
-- ---------------------------------------------------------------------------
create policy progress_own on public.progress for all to authenticated
  using (public.owns_child(child_id)) with check (public.owns_child(child_id));
create policy topic_progress_own on public.topic_progress for all to authenticated
  using (public.owns_child(child_id)) with check (public.owns_child(child_id));
create policy learning_sessions_own on public.learning_sessions for all to authenticated
  using (public.owns_child(child_id)) with check (public.owns_child(child_id));

-- Attempts and rewards are written only by the server side (submit_attempt, award_star_rewards).
create policy exercise_attempts_read on public.exercise_attempts for select to authenticated
  using (public.owns_child(child_id));
create policy rewards_read on public.rewards for select to authenticated
  using (public.owns_child(child_id));
revoke insert, update, delete on public.exercise_attempts, public.rewards from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Billing: read-only for the owner
-- ---------------------------------------------------------------------------
create policy subscriptions_read on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy payments_read on public.payments for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.subscriptions s where s.id = subscription_id and s.user_id = (select auth.uid())));
revoke insert, update, delete on public.subscriptions, public.payments from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Answer checking. The client sends an answer, the server compares it with loesung and
-- returns only true/false, so solutions never leave the database.
-- Answer shapes mirror loesung: {"index": n} | {"wert": n} | {"paare": [[l, r], ...]}.
-- ---------------------------------------------------------------------------
create function public.submit_attempt(
  p_child uuid, p_exercise uuid, p_antwort jsonb, p_dauer_ms integer default null
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  ex      public.exercises%rowtype;
  item    public.content_items%rowtype;
  ok      boolean;
begin
  if not public.owns_child(p_child) then
    raise exception 'not your child profile' using errcode = '42501';
  end if;

  select * into ex from public.exercises where id = p_exercise;
  if not found then
    raise exception 'unknown exercise' using errcode = 'no_data_found';
  end if;
  select * into item from public.content_items where id = ex.content_item_id;
  if item.status <> 'veroeffentlicht' then
    raise exception 'exercise is not published' using errcode = '42501';
  end if;

  begin
    ok := case ex.fragetyp
      when 'multiple_choice' then (p_antwort -> 'index') = (ex.loesung -> 'index')
      when 'zahl_eingeben'   then (p_antwort ->> 'wert')::numeric = (ex.loesung ->> 'wert')::numeric
      when 'zuordnen' then
        coalesce((select jsonb_agg(p order by p) from jsonb_array_elements(p_antwort -> 'paare') p), '[]'::jsonb)
        = coalesce((select jsonb_agg(p order by p) from jsonb_array_elements(ex.loesung -> 'paare') p), '[]'::jsonb)
    end;
  exception when others then
    ok := false;    -- malformed answer (e.g. text instead of a number) counts as wrong
  end;
  ok := coalesce(ok, false);

  insert into public.exercise_attempts (child_id, exercise_id, antwort, korrekt, dauer_ms)
  values (p_child, p_exercise, p_antwort, ok, p_dauer_ms);

  insert into public.progress (child_id, content_item_id, status, punkte)
  values (p_child, item.id, 'begonnen', case when ok then ex.punkte else 0 end)
  on conflict (child_id, content_item_id) do update
    set punkte = public.progress.punkte + excluded.punkte, zuletzt_am = now();

  return ok;
end $$;

revoke execute on function public.submit_attempt(uuid, uuid, jsonb, integer) from public, anon;
grant  execute on function public.submit_attempt(uuid, uuid, jsonb, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage (KONZEPT.md §11: photos private, only visible to the family)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars',      'avatars',      true,  1048576, array['image/svg+xml', 'image/png', 'image/webp']),
  ('child-photos', 'child-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('worksheets',   'worksheets',   false, 10485760, array['application/pdf']);

-- Child photos: object path is '<parent user id>/<file>'. Only that parent can touch it.
create policy child_photos_own_read on storage.objects for select to authenticated
  using (bucket_id = 'child-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy child_photos_own_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'child-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy child_photos_own_update on storage.objects for update to authenticated
  using (bucket_id = 'child-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy child_photos_own_delete on storage.objects for delete to authenticated
  using (bucket_id = 'child-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Avatar images are public (our own artwork); only admins upload them.
create policy avatars_admin_write_files on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and public.is_admin()) with check (bucket_id = 'avatars' and public.is_admin());

-- Worksheets: any signed-in user reads, admins manage.
create policy worksheets_read on storage.objects for select to authenticated
  using (bucket_id = 'worksheets');
create policy worksheets_admin_write on storage.objects for all to authenticated
  using (bucket_id = 'worksheets' and public.is_admin()) with check (bucket_id = 'worksheets' and public.is_admin());
