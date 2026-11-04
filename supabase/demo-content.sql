-- DEMO CONTENT for local development and tests only. NOT part of the production seed.
-- Two topics of year 1 maths (unit 1) get a small published exercise set in Arabic and French,
-- covering the three question types. Real content is entered in the admin area (phase 5).
-- Videos are not included: a video needs a real medien_url from the video service.

do $$
declare
  tn uuid := (select id from public.topics where slug = 'math-g1-u1-t3');   -- numbers 1 to 5
  tc uuid := (select id from public.topics where slug = 'math-g1-u1-t4');   -- compare numbers 1 to 5
  item uuid;
begin
  if tn is null or tc is null then
    raise exception 'curriculum seed must be loaded first';
  end if;

  -- ---- numbers Arabic ---------------------------------------------------------------------
  insert into public.content_items (topic_id, typ, sprache, status) values (tn, 'uebung', 'ar', 'veroeffentlicht')
    returning id into item;
  insert into public.translations (entity_type, entity_id, sprache, feld, text, quality)
    values ('content_item', item, 'ar', 'title', 'تمارين: الأعداد من 1 إلى 5', 'derived');
  insert into public.exercises (content_item_id, reihenfolge, fragetyp, daten, loesung) values
    (item, 1, 'multiple_choice', '{"frage":"كم عدد النجوم؟ ⭐⭐⭐","optionen":["2","3","4"]}', '{"index":1}'),
    (item, 2, 'zahl_eingeben',   '{"frage":"ما هو العدد الذي يأتي بعد 2؟"}', '{"wert":3}'),
    (item, 3, 'zuordnen',        '{"links":["1","2","3"],"rechts":["ثلاثة","واحد","اثنان"]}', '{"paare":[[0,1],[1,2],[2,0]]}'),
    (item, 4, 'multiple_choice', '{"frage":"كم عدد أصابع اليد الواحدة؟","optionen":["4","5","6"]}', '{"index":1}');

  -- ---- numbers French ---------------------------------------------------------------------
  insert into public.content_items (topic_id, typ, sprache, status) values (tn, 'uebung', 'fr', 'veroeffentlicht')
    returning id into item;
  insert into public.translations (entity_type, entity_id, sprache, feld, text, quality)
    values ('content_item', item, 'fr', 'title', 'Exercices : les nombres de 1 à 5', 'unreviewed');
  insert into public.exercises (content_item_id, reihenfolge, fragetyp, daten, loesung) values
    (item, 1, 'multiple_choice', '{"frage":"Combien d''étoiles ? ⭐⭐⭐","optionen":["2","3","4"]}', '{"index":1}'),
    (item, 2, 'zahl_eingeben',   '{"frage":"Quel nombre vient après 2 ?"}', '{"wert":3}'),
    (item, 3, 'zuordnen',        '{"links":["1","2","3"],"rechts":["trois","un","deux"]}', '{"paare":[[0,1],[1,2],[2,0]]}'),
    (item, 4, 'multiple_choice', '{"frage":"Combien de doigts sur une main ?","optionen":["4","5","6"]}', '{"index":1}');

  -- ---- compare Arabic ---------------------------------------------------------------------
  insert into public.content_items (topic_id, typ, sprache, status) values (tc, 'uebung', 'ar', 'veroeffentlicht')
    returning id into item;
  insert into public.translations (entity_type, entity_id, sprache, feld, text, quality)
    values ('content_item', item, 'ar', 'title', 'تمارين: مقارنة الأعداد من 1 إلى 5', 'derived');
  insert into public.exercises (content_item_id, reihenfolge, fragetyp, daten, loesung) values
    (item, 1, 'multiple_choice', '{"frage":"أي عدد هو الأكبر؟","optionen":["3","5","4"]}', '{"index":1}'),
    (item, 2, 'multiple_choice', '{"frage":"أي عدد هو الأصغر؟","optionen":["2","1","3"]}', '{"index":1}'),
    (item, 3, 'zahl_eingeben',   '{"frage":"اكتب العدد الذي يقع بين 2 و 4"}', '{"wert":3}');

  -- ---- compare French ---------------------------------------------------------------------
  insert into public.content_items (topic_id, typ, sprache, status) values (tc, 'uebung', 'fr', 'veroeffentlicht')
    returning id into item;
  insert into public.translations (entity_type, entity_id, sprache, feld, text, quality)
    values ('content_item', item, 'fr', 'title', 'Exercices : comparer les nombres de 1 à 5', 'unreviewed');
  insert into public.exercises (content_item_id, reihenfolge, fragetyp, daten, loesung) values
    (item, 1, 'multiple_choice', '{"frage":"Quel nombre est le plus grand ?","optionen":["3","5","4"]}', '{"index":1}'),
    (item, 2, 'multiple_choice', '{"frage":"Quel nombre est le plus petit ?","optionen":["2","1","3"]}', '{"index":1}'),
    (item, 3, 'zahl_eingeben',   '{"frage":"Écris le nombre qui est entre 2 et 4."}', '{"wert":3}');
end $$;
