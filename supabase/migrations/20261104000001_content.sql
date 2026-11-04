-- TA3LIM schema, part 1: curriculum structure, translations, learning content.
-- KONZEPT.md §3 (curriculum as data, multilingual) and §4 (first draft of the model).
-- Column names follow the concept (German), identifiers are ASCII (waehrung, loesung, ...).

create type public.lang                as enum ('ar', 'fr', 'darija');
create type public.education_level     as enum ('primaire', 'college', 'lycee');
create type public.topic_domain        as enum ('number', 'geometry', 'measure', 'data');
create type public.content_type        as enum ('video', 'uebung', 'arbeitsblatt');
create type public.question_type       as enum ('multiple_choice', 'zahl_eingeben', 'zuordnen');
create type public.publish_status      as enum ('entwurf', 'veroeffentlicht');
create type public.translation_quality as enum ('official', 'derived', 'unreviewed');

-- Generic updated_at maintenance, reused by later migrations.
create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Curriculum hierarchy: Lehrplan -> Klasse -> Fach -> Kapitel -> Thema
-- ---------------------------------------------------------------------------
create table public.curricula (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  land              char(2) not null check (land ~ '^[A-Z]{2}$'),   -- ISO 3166-1 alpha-2
  name              text not null,
  schuljahr_version text not null,
  created_at        timestamptz not null default now()
);

create table public.grades (
  id            uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curricula (id) on delete cascade,
  stufe         public.education_level not null,
  nummer        smallint not null check (nummer between 1 and 6),
  unique (curriculum_id, stufe, nummer)
);

create table public.subjects (
  id            uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curricula (id) on delete cascade,
  code          text not null check (code ~ '^[a-z0-9_]+$'),
  unique (curriculum_id, code)
);

create table public.chapters (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  grade_id     uuid not null references public.grades (id) on delete cascade,
  subject_id   uuid not null references public.subjects (id) on delete cascade,
  reihenfolge  integer not null check (reihenfolge > 0),
  semester     smallint check (semester in (1, 2)),
  review_week  smallint check (review_week > 0),   -- week of the unit test in the official yearly plan
  unique (grade_id, subject_id, reihenfolge)
);
create index chapters_subject_idx on public.chapters (subject_id);

create table public.topics (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  chapter_id   uuid not null references public.chapters (id) on delete cascade,
  reihenfolge  integer not null check (reihenfolge > 0),
  week         smallint check (week > 0),          -- teaching week in the official yearly plan
  domain       public.topic_domain,
  unique (chapter_id, reihenfolge)
);

-- ---------------------------------------------------------------------------
-- Translations: one row per entity, language and field (ar / fr / darija).
-- entity_id is polymorphic, so there is no foreign key; the triggers below remove
-- the rows when their entity is deleted.
-- ---------------------------------------------------------------------------
create table public.translations (
  entity_type text not null check (entity_type in
                ('curriculum', 'grade', 'subject', 'chapter', 'topic', 'content_item', 'avatar', 'plan')),
  entity_id   uuid not null,
  sprache     public.lang not null,
  feld        text not null,
  text        text not null,
  quality     public.translation_quality not null default 'unreviewed',
  updated_at  timestamptz not null default now(),
  primary key (entity_type, entity_id, sprache, feld)
);
create index translations_entity_idx on public.translations (entity_type, entity_id);
create trigger translations_touch before update on public.translations
  for each row execute function public.touch_updated_at();

create function public.delete_translations() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.translations where entity_type = tg_argv[0] and entity_id = old.id;
  return old;
end $$;

create trigger curricula_translations_cleanup after delete on public.curricula
  for each row execute function public.delete_translations('curriculum');
create trigger grades_translations_cleanup    after delete on public.grades
  for each row execute function public.delete_translations('grade');
create trigger subjects_translations_cleanup  after delete on public.subjects
  for each row execute function public.delete_translations('subject');
create trigger chapters_translations_cleanup  after delete on public.chapters
  for each row execute function public.delete_translations('chapter');
create trigger topics_translations_cleanup    after delete on public.topics
  for each row execute function public.delete_translations('topic');

-- ---------------------------------------------------------------------------
-- Learning content: video / exercise set / worksheet per topic
-- ---------------------------------------------------------------------------
create table public.content_items (
  id          uuid primary key default gen_random_uuid(),
  topic_id    uuid not null references public.topics (id) on delete cascade,
  typ         public.content_type not null,
  sprache     public.lang not null,
  reihenfolge integer not null default 1 check (reihenfolge > 0),
  medien_url  text,                                  -- Bunny Stream URL (video) or storage path (PDF)
  dauer       integer check (dauer >= 0),            -- seconds, videos only
  status      public.publish_status not null default 'entwurf',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (topic_id, typ, sprache, reihenfolge),
  check (typ = 'uebung' or status = 'entwurf' or medien_url is not null)
);
create trigger content_items_touch before update on public.content_items
  for each row execute function public.touch_updated_at();
create trigger content_items_translations_cleanup after delete on public.content_items
  for each row execute function public.delete_translations('content_item');

-- Exercises. The JSON contract per question type (texts are in the content item's language):
--   multiple_choice: daten {"frage": text, "optionen": [text, ...]}   loesung {"index": int}
--   zahl_eingeben:   daten {"frage": text, "einheit"?: text}          loesung {"wert": number}
--   zuordnen:        daten {"links": [text, ...], "rechts": [text, ...]}
--                    loesung {"paare": [[linksIndex, rechtsIndex], ...]}
create function public.exercise_shape_ok(p_typ public.question_type, p_daten jsonb, p_loesung jsonb)
returns boolean language sql immutable as $$
  select case p_typ
    when 'multiple_choice' then
      jsonb_typeof(p_daten -> 'frage') = 'string'
      and jsonb_typeof(p_daten -> 'optionen') = 'array'
      and jsonb_array_length(p_daten -> 'optionen') >= 2
      and jsonb_typeof(p_loesung -> 'index') = 'number'
    when 'zahl_eingeben' then
      jsonb_typeof(p_daten -> 'frage') = 'string'
      and jsonb_typeof(p_loesung -> 'wert') = 'number'
    when 'zuordnen' then
      jsonb_typeof(p_daten -> 'links') = 'array'
      and jsonb_typeof(p_daten -> 'rechts') = 'array'
      and jsonb_typeof(p_loesung -> 'paare') = 'array'
  end
$$;

create table public.exercises (
  id              uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  reihenfolge     integer not null default 1 check (reihenfolge > 0),
  fragetyp        public.question_type not null,
  daten           jsonb not null,
  loesung         jsonb not null,    -- never readable by clients, see RLS migration
  punkte          smallint not null default 1 check (punkte > 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (content_item_id, reihenfolge),
  check (coalesce(public.exercise_shape_ok(fragetyp, daten, loesung), false))
);
create trigger exercises_touch before update on public.exercises
  for each row execute function public.touch_updated_at();

create function public.exercises_require_uebung() returns trigger
language plpgsql as $$
begin
  if not exists (select 1 from public.content_items where id = new.content_item_id and typ = 'uebung') then
    raise exception 'exercises can only belong to content items of type uebung';
  end if;
  return new;
end $$;
create trigger exercises_require_uebung before insert or update of content_item_id on public.exercises
  for each row execute function public.exercises_require_uebung();
