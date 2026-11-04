-- TA3LIM schema, part 7: what the admin area needs.
--   * translation_quality 'reviewed': a native speaker checked the text (admin "review translations").
--   * admin_exercise(): lets an admin read ONE exercise including its solution.
--     exercises.loesung is not selectable for clients (migration 5), so the browser client could
--     never show the solution in the editor. Writes still go through the admin RLS policies.

alter type public.translation_quality add value if not exists 'reviewed';

create function public.admin_exercise(p_id uuid) returns public.exercises
language plpgsql stable security definer set search_path = '' as $$
declare
  result public.exercises;
begin
  if not public.is_admin() then
    raise exception 'admins only' using errcode = '42501';
  end if;
  select * into result from public.exercises where id = p_id;
  return result;
end $$;

revoke execute on function public.admin_exercise(uuid) from public, anon;
grant  execute on function public.admin_exercise(uuid) to authenticated;
