-- TA3LIM schema, part 3: learning progress, attempts, rewards, sessions, parent dashboard views.
-- KONZEPT.md §2 (progress, rewards), §4 and §10 (parent dashboard).

create type public.progress_status as enum ('nicht_begonnen', 'begonnen', 'abgeschlossen');
create type public.reward_type     as enum ('stern', 'abzeichen', 'serie');

-- Progress per child and content item (video watched, exercise set done, worksheet opened).
create table public.progress (
  child_id        uuid not null references public.child_profiles (id) on delete cascade,
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  status          public.progress_status not null default 'begonnen',
  punkte          integer not null default 0 check (punkte >= 0),
  zuletzt_am      timestamptz not null default now(),
  primary key (child_id, content_item_id)
);

-- Stars per topic (MVP: "Fortschritt mit Sternen pro Thema"), 0..3.
create table public.topic_progress (
  child_id    uuid not null references public.child_profiles (id) on delete cascade,
  topic_id    uuid not null references public.topics (id) on delete cascade,
  status      public.progress_status not null default 'begonnen',
  sterne      smallint not null default 0 check (sterne between 0 and 3),
  zuletzt_am  timestamptz not null default now(),
  primary key (child_id, topic_id)
);

create table public.exercise_attempts (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references public.child_profiles (id) on delete cascade,
  exercise_id  uuid not null references public.exercises (id) on delete cascade,
  antwort      jsonb not null,
  korrekt      boolean not null,
  zeitstempel  timestamptz not null default now(),
  dauer_ms     integer check (dauer_ms >= 0)
);
create index exercise_attempts_child_time_idx on public.exercise_attempts (child_id, zeitstempel desc);
create index exercise_attempts_exercise_idx   on public.exercise_attempts (exercise_id);

create table public.rewards (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.child_profiles (id) on delete cascade,
  typ         public.reward_type not null,
  wert        integer not null default 1,
  code        text,                                                -- badge identifier, if any
  topic_id    uuid references public.topics (id) on delete set null,
  erhalten_am timestamptz not null default now()
);
create index rewards_child_idx on public.rewards (child_id, erhalten_am desc);

-- Learning time (§10). dauer is derived so it can never disagree with start/ende.
create table public.learning_sessions (
  id       uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.child_profiles (id) on delete cascade,
  start    timestamptz not null default now(),
  ende     timestamptz,
  dauer    integer generated always as
             (case when ende is null then null else extract(epoch from (ende - start))::integer end) stored,
  check (ende is null or ende >= start)
);
create index learning_sessions_child_idx on public.learning_sessions (child_id, start desc);

-- A new star on a topic creates a reward row automatically.
create function public.award_star_rewards() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  gained integer := new.sterne - coalesce(old.sterne, 0);
begin
  if gained > 0 then
    insert into public.rewards (child_id, typ, wert, topic_id) values (new.child_id, 'stern', gained, new.topic_id);
  end if;
  return new;
end $$;
create trigger topic_progress_rewards after insert or update of sterne on public.topic_progress
  for each row execute function public.award_star_rewards();

-- ---------------------------------------------------------------------------
-- Parent dashboard views. security_invoker: the caller's RLS applies, so a parent
-- only ever sees their own children. Days use Moroccan local time.
-- ---------------------------------------------------------------------------
create view public.v_child_overview with (security_invoker = true) as
select
  c.id as child_id,
  c.parent_user_id,
  coalesce(tp.topics_done, 0)  as topics_completed,
  coalesce(tp.stars, 0)        as stars,
  coalesce(a.attempts, 0)      as attempts,
  coalesce(a.correct, 0)       as correct,
  case when coalesce(a.attempts, 0) = 0 then null
       else round(100.0 * a.correct / a.attempts, 1) end as correct_rate
from public.child_profiles c
left join (
  select child_id,
         count(*) filter (where status = 'abgeschlossen') as topics_done,
         sum(sterne) as stars
  from public.topic_progress group by child_id
) tp on tp.child_id = c.id
left join (
  select child_id, count(*) as attempts, count(*) filter (where korrekt) as correct
  from public.exercise_attempts group by child_id
) a on a.child_id = c.id;

-- One row per child and day: what was learned and for how long (feeds the daily and weekly views).
create view public.v_child_daily with (security_invoker = true) as
with activity as (
  select child_id, (zeitstempel at time zone 'Africa/Casablanca')::date as day,
         count(*) as attempts, count(*) filter (where korrekt) as correct
  from public.exercise_attempts group by 1, 2
), done as (
  select child_id, (zuletzt_am at time zone 'Africa/Casablanca')::date as day,
         count(*) as topics_completed
  from public.topic_progress where status = 'abgeschlossen' group by 1, 2
), watched as (
  select p.child_id, (p.zuletzt_am at time zone 'Africa/Casablanca')::date as day,
         count(*) as videos_watched
  from public.progress p join public.content_items ci on ci.id = p.content_item_id
  where ci.typ = 'video' group by 1, 2
), time_spent as (
  select child_id, (start at time zone 'Africa/Casablanca')::date as day,
         coalesce(sum(dauer), 0) as learning_seconds
  from public.learning_sessions group by 1, 2
), days as (
  select child_id, day from activity union select child_id, day from done
  union select child_id, day from watched union select child_id, day from time_spent
)
select d.child_id, d.day,
       coalesce(done.topics_completed, 0)       as topics_completed,
       coalesce(watched.videos_watched, 0)      as videos_watched,
       coalesce(activity.attempts, 0)           as attempts,
       coalesce(activity.correct, 0)            as correct,
       coalesce(time_spent.learning_seconds, 0) as learning_seconds
from days d
left join activity   using (child_id, day)
left join done       using (child_id, day)
left join watched    using (child_id, day)
left join time_spent using (child_id, day);

-- Weak spots: error rate per topic (only topics with attempts).
create view public.v_child_topic_errors with (security_invoker = true) as
select ea.child_id, t.id as topic_id,
       count(*) as attempts,
       count(*) filter (where not ea.korrekt) as wrong,
       round(100.0 * count(*) filter (where not ea.korrekt) / count(*), 1) as error_rate
from public.exercise_attempts ea
join public.exercises e       on e.id = ea.exercise_id
join public.content_items ci  on ci.id = e.content_item_id
join public.topics t          on t.id = ci.topic_id
group by ea.child_id, t.id;
