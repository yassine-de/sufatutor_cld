-- TA3LIM schema, part 2: parent accounts and child profiles.
-- KONZEPT.md §3.3 (family accounts), §9 (phone login), §11 (avatar or own photo).
-- Children have no login of their own: they are profiles inside the parent's session.

create type public.user_role as enum ('eltern', 'lehrer', 'admin');

-- Application profile of an auth.users row.
create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  rolle       public.user_role not null default 'eltern',
  telefon     text unique,
  email       text,
  anzeigename text,
  sprache     public.lang not null default 'ar',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger users_touch before update on public.users
  for each row execute function public.touch_updated_at();

-- Every new sign-up (phone or e-mail) gets a parent profile. Roles other than 'eltern'
-- are assigned by an admin (service role), never by the client.
create function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id, telefon, email)
  values (new.id, nullif(new.phone, ''), nullif(new.email, ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Avatar gallery: our own characters. bild_pfad is an app-relative URL (e.g. '/avatars/fox.svg',
-- served from public/avatars) or, for avatars uploaded later, a path in the public 'avatars' bucket.
create table public.avatars (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  bild_pfad   text not null,
  reihenfolge integer not null default 0,
  aktiv       boolean not null default true
);
create trigger avatars_translations_cleanup after delete on public.avatars
  for each row execute function public.delete_translations('avatar');

create table public.child_profiles (
  id             uuid primary key default gen_random_uuid(),
  parent_user_id uuid not null references public.users (id) on delete cascade,
  name           text not null check (char_length(btrim(name)) between 1 and 40),
  avatar_id      uuid references public.avatars (id) on delete set null,
  photo_url      text,                       -- path in the PRIVATE 'child-photos' bucket, never a public URL
  grade_id       uuid references public.grades (id) on delete set null,
  sprache        public.lang not null default 'ar' check (sprache in ('ar', 'fr')),  -- §9: parent picks per child
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- the folder in the bucket is the parent's id (the storage policy relies on it)
  check (photo_url is null or photo_url like parent_user_id::text || '/%')
);
create index child_profiles_parent_idx on public.child_profiles (parent_user_id);
create trigger child_profiles_touch before update on public.child_profiles
  for each row execute function public.touch_updated_at();
