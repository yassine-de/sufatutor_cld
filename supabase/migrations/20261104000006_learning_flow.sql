-- TA3LIM schema, part 6: what the learning area needs on the server side.
--   * finish_topic_practice(): turns the answers of a child into stars (0..3) for a topic.
--   * track_learning():        heartbeat that records learning time (feeds the parent dashboard).
-- Both are SECURITY DEFINER and check that the caller owns the child profile.

-- Stars are derived from the child's latest answer per exercise of the topic, in the child's
-- learning language. Stars only ever go up (a worse retry never takes a star away).
--   >= 90 % correct: 3 stars, >= 70 %: 2, >= 50 %: 1, below: 0 (the topic stays "begonnen").
-- A topic counts as completed when every exercise was answered and at least 1 star was earned.
create function public.finish_topic_practice(p_child uuid, p_topic uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  child_lang   public.lang;
  total        integer;
  answered     integer;
  correct      integer;
  new_stars    smallint;
  best         smallint;
  is_done      boolean;
begin
  if not public.owns_child(p_child) then
    raise exception 'not your child profile' using errcode = '42501';
  end if;
  select sprache into child_lang from public.child_profiles where id = p_child;

  with ex as (
    select e.id
      from public.exercises e
      join public.content_items ci on ci.id = e.content_item_id
     where ci.topic_id = p_topic and ci.typ = 'uebung'
       and ci.status = 'veroeffentlicht' and ci.sprache = child_lang
  ), latest as (
    select distinct on (a.exercise_id) a.exercise_id, a.korrekt
      from public.exercise_attempts a
     where a.child_id = p_child and a.exercise_id in (select id from ex)
     order by a.exercise_id, a.zeitstempel desc
  )
  select (select count(*) from ex), count(*), count(*) filter (where korrekt)
    into total, answered, correct
    from latest;

  select coalesce(max(sterne), 0) into best
    from public.topic_progress where child_id = p_child and topic_id = p_topic;

  if total = 0 or answered < total then
    return jsonb_build_object('total', total, 'answered', answered, 'correct', correct,
                              'stars', 0, 'best_stars', best, 'completed', false);
  end if;

  new_stars := case when correct * 10 >= total * 9 then 3
                    when correct * 10 >= total * 7 then 2
                    when correct * 10 >= total * 5 then 1
                    else 0 end;
  best := greatest(best, new_stars);
  is_done := best >= 1;

  insert into public.topic_progress (child_id, topic_id, status, sterne, zuletzt_am)
  values (p_child, p_topic, (case when is_done then 'abgeschlossen' else 'begonnen' end)::public.progress_status, best, now())
  on conflict (child_id, topic_id) do update
    set sterne = excluded.sterne,
        status = case when is_done or public.topic_progress.status = 'abgeschlossen'
                      then 'abgeschlossen'::public.progress_status else 'begonnen' end,
        zuletzt_am = now();

  -- the exercise set(s) of this topic are done as well
  update public.progress p set status = 'abgeschlossen', zuletzt_am = now()
   from public.content_items ci
   where p.child_id = p_child and p.content_item_id = ci.id and ci.topic_id = p_topic
     and ci.typ = 'uebung' and is_done;

  return jsonb_build_object('total', total, 'answered', answered, 'correct', correct,
                            'stars', new_stars, 'best_stars', best, 'completed', is_done);
end $$;

revoke execute on function public.finish_topic_practice(uuid, uuid) from public, anon;
grant  execute on function public.finish_topic_practice(uuid, uuid) to authenticated;

-- Learning time: the app calls this every ~30 seconds while a child is learning and the page is
-- visible. Calls less than 5 minutes apart extend the same session, a longer gap starts a new one.
create function public.track_learning(p_child uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  open_session uuid;
begin
  if not public.owns_child(p_child) then
    raise exception 'not your child profile' using errcode = '42501';
  end if;

  select id into open_session
    from public.learning_sessions
   where child_id = p_child and ende >= now() - interval '5 minutes'
   order by ende desc limit 1;

  if open_session is null then
    insert into public.learning_sessions (child_id, start, ende) values (p_child, now(), now());
  else
    update public.learning_sessions set ende = now() where id = open_session;
  end if;
end $$;

revoke execute on function public.track_learning(uuid) from public, anon;
grant  execute on function public.track_learning(uuid) to authenticated;
