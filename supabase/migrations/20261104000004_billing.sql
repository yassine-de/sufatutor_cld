-- TA3LIM schema, part 4: plans, subscriptions, payments (KONZEPT.md §3.4).
-- Kept separate from the rest so prices and payment providers can change freely.
-- Clients can only read their own rows; all writes come from the server (service role).

create type public.subscription_status as enum ('testphase', 'aktiv', 'zahlung_offen', 'gekuendigt', 'abgelaufen');
create type public.payment_status      as enum ('offen', 'bezahlt', 'fehlgeschlagen', 'erstattet');

create table public.plans (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  preis         numeric(10, 2) not null check (preis >= 0),
  waehrung      char(3) not null default 'MAD' check (waehrung ~ '^[A-Z]{3}$'),
  laufzeit_tage integer not null check (laufzeit_tage > 0),
  max_kinder    smallint not null default 3 check (max_kinder > 0),   -- MVP: up to 3 child profiles
  aktiv         boolean not null default true,
  created_at    timestamptz not null default now()
);
create trigger plans_translations_cleanup after delete on public.plans
  for each row execute function public.delete_translations('plan');

create table public.subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  plan_id    uuid not null references public.plans (id),
  status     public.subscription_status not null default 'aktiv',
  start      timestamptz not null default now(),
  ende       timestamptz,
  created_at timestamptz not null default now(),
  check (ende is null or ende > start)
);
create index subscriptions_user_idx on public.subscriptions (user_id);

create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  anbieter        text not null,                  -- payment provider, free text so it stays exchangeable
  betrag          numeric(10, 2) not null check (betrag >= 0),
  waehrung        char(3) not null default 'MAD' check (waehrung ~ '^[A-Z]{3}$'),
  status          public.payment_status not null default 'offen',
  referenz        text,                           -- provider transaction id
  created_at      timestamptz not null default now()
);
create index payments_subscription_idx on public.payments (subscription_id);
create unique index payments_provider_ref_idx on public.payments (anbieter, referenz) where referenz is not null;

-- Child profile limit: the active plan decides, 3 without a plan (MVP / free pilot).
create function public.child_limit_for(p_user uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select max(pl.max_kinder)
       from public.subscriptions s join public.plans pl on pl.id = s.plan_id
      where s.user_id = p_user
        and s.status in ('testphase', 'aktiv')
        and (s.ende is null or s.ende > now())),
    3)
$$;

-- Not callable by clients with someone else's id; they ask for their own limit instead.
revoke execute on function public.child_limit_for(uuid) from public, anon, authenticated;

create function public.my_child_limit() returns integer
language sql stable security definer set search_path = '' as $$
  select public.child_limit_for((select auth.uid()))
$$;
revoke execute on function public.my_child_limit() from public, anon;
grant  execute on function public.my_child_limit() to authenticated;

create function public.enforce_child_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- A signed-in user inserting for someone else is rejected by RLS; do not leak that family's size here.
  if (select auth.uid()) is not null and new.parent_user_id <> (select auth.uid()) then
    return new;
  end if;
  -- serialize concurrent inserts for the same parent so the count cannot be raced
  perform pg_advisory_xact_lock(hashtextextended(new.parent_user_id::text, 0));
  if (select count(*) from public.child_profiles where parent_user_id = new.parent_user_id)
       >= public.child_limit_for(new.parent_user_id) then
    raise exception 'child profile limit reached' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger child_profiles_limit before insert on public.child_profiles
  for each row execute function public.enforce_child_limit();
