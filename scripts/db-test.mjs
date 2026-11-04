// Applies supabase/migrations + supabase/seed.sql to an in-memory Postgres (PGlite) and checks
// constraints, row level security and the answer checking. No Docker or Supabase CLI needed.
//   npm run db:test
//
// Supabase provides the roles and the auth/storage schemas; here they are minimal stubs that
// behave the same way for what the migrations use (auth.uid(), storage.foldername(), ...).
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const root = new URL("../supabase/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const db = new PGlite();

await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), phone text, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id),
    name text, owner uuid);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema storage to anon, authenticated, service_role;
  grant all on all tables in schema storage to anon, authenticated, service_role;
  grant execute on all functions in schema storage to anon, authenticated, service_role;
`);

// ---- apply migrations and seed ------------------------------------------------------------
const migrations = readdirSync(join(root, "migrations")).filter((f) => f.endsWith(".sql")).sort();
for (const file of migrations) {
  await db.exec(readFileSync(join(root, "migrations", file), "utf8"));
  console.log("applied", file);
}
await db.exec(readFileSync(join(root, "seed.sql"), "utf8"));
console.log("applied seed.sql");

// ---- helpers ------------------------------------------------------------------------------
let passed = 0;
async function as(role, sub, fn) {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [sub ?? ""]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}
const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const rows = async (sql, params) => (await db.query(sql, params)).rows;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log("  ok  ", name);
  } catch (error) {
    console.error("  FAIL", name, "\n      ", error.message);
    process.exitCode = 1;
  }
}
async function rejects(promiseFactory, pattern, label) {
  let error;
  try {
    await promiseFactory();
  } catch (e) {
    error = e;
  }
  assert.ok(error, `${label}: expected an error but the statement succeeded`);
  assert.match(error.message, pattern, label);
}

// ---- fixtures -----------------------------------------------------------------------------
const parentA = (await one("insert into auth.users (phone) values ('+212600000001') returning id")).id;
const parentB = (await one("insert into auth.users (phone) values ('+212600000002') returning id")).id;
const adminId = (await one("insert into auth.users (email) values ('admin@example.test') returning id")).id;
await db.query("update public.users set rolle = 'admin' where id = $1", [adminId]);

// ---- seed ---------------------------------------------------------------------------------
await test("seed loaded: 1 curriculum, 3 grades, 18 chapters, 96 topics, 274 translations, 8 avatars", async () => {
  const c = await one(`select (select count(*) from curricula)::int c, (select count(*) from grades)::int g,
    (select count(*) from chapters)::int ch, (select count(*) from topics)::int t, (select count(*) from translations where entity_type <> 'avatar')::int tr,
    (select count(*) from avatars)::int av`);
  assert.deepEqual(c, { c: 1, g: 3, ch: 18, t: 96, tr: 274, av: 8 });
});
await test("every topic has ar and fr titles", async () => {
  const r = await one(`select count(*)::int n from topics t where
    (select count(*) from translations x where x.entity_id = t.id and x.entity_type = 'topic' and x.feld = 'title'
       and x.sprache in ('ar', 'fr')) <> 2`);
  assert.equal(r.n, 0);
});
await test("pilot plan exists", async () => {
  assert.equal((await one("select max_kinder::int m from plans where slug = 'pilot'")).m, 3);
});

// ---- accounts -----------------------------------------------------------------------------
await test("sign-up creates a parent profile with phone", async () => {
  const u = await one("select rolle, telefon, sprache from users where id = $1", [parentA]);
  assert.deepEqual(u, { rolle: "eltern", telefon: "+212600000001", sprache: "ar" });
});
await test("user can edit display name but not role", async () => {
  await as("authenticated", parentA, () => db.query("update users set anzeigename = 'Mama A' where id = $1", [parentA]));
  await as("authenticated", parentA, () =>
    rejects(() => db.query("update users set rolle = 'admin' where id = $1", [parentA]), /permission denied/, "role escalation"));
  assert.equal((await one("select anzeigename n from users where id = $1", [parentA])).n, "Mama A");
});
await test("users only see their own profile", async () => {
  const seen = await as("authenticated", parentA, () => rows("select id from users"));
  assert.deepEqual(seen.map((r) => r.id), [parentA]);
});

// ---- children -----------------------------------------------------------------------------
const grade1 = (await one("select id from grades where nummer = 1")).id;
const kids = [];
await test("parent can create up to 3 child profiles, the 4th is rejected", async () => {
  for (const name of ["Salma", "Yassine", "Nour"]) {
    const r = await as("authenticated", parentA, () =>
      one("insert into child_profiles (parent_user_id, name, grade_id, sprache) values ($1, $2, $3, 'fr') returning id",
        [parentA, name, grade1]));
    kids.push(r.id);
  }
  await as("authenticated", parentA, () =>
    rejects(() => db.query("insert into child_profiles (parent_user_id, name) values ($1, 'Vier')", [parentA]),
      /child profile limit reached/, "4th child"));
});
await test("a plan with max_kinder = 5 raises the limit", async () => {
  const plan = await one("insert into plans (slug, name, preis, laufzeit_tage, max_kinder) values ('family5', 'Family', 49, 30, 5) returning id");
  await db.query("insert into subscriptions (user_id, plan_id, status) values ($1, $2, 'aktiv')", [parentA, plan.id]);
  const extra = await as("authenticated", parentA, () =>
    one("insert into child_profiles (parent_user_id, name) values ($1, 'Vier') returning id", [parentA]));
  await db.query("delete from child_profiles where id = $1", [extra.id]);
  await db.query("delete from subscriptions where user_id = $1", [parentA]);
});
await test("parents can ask for their own child limit, but not for someone else's", async () => {
  assert.equal(await as("authenticated", parentA, async () => (await one("select my_child_limit()::int l")).l), 3);
  await as("authenticated", parentA, () =>
    rejects(() => db.query("select child_limit_for($1)", [parentB]), /permission denied/, "foreign limit lookup"));
});
await test("parent B cannot see or create children for parent A", async () => {
  const seen = await as("authenticated", parentB, () => rows("select id from child_profiles"));
  assert.equal(seen.length, 0);
  await as("authenticated", parentB, () =>
    rejects(() => db.query("insert into child_profiles (parent_user_id, name) values ($1, 'Intruder')", [parentA]),
      /row-level security/, "insert for other parent"));
});
await test("child language limited to ar/fr; photo path must live in the parent's folder", async () => {
  await as("authenticated", parentB, async () => {
    await rejects(() => db.query("insert into child_profiles (parent_user_id, name, sprache) values ($1, 'X', 'darija')", [parentB]),
      /violates check constraint/, "darija child");
    await rejects(() => db.query("insert into child_profiles (parent_user_id, name, photo_url) values ($1, 'X', $2)", [parentB, `${parentA}/p.jpg`]),
      /violates check constraint/, "foreign photo folder");
    await db.query("insert into child_profiles (parent_user_id, name, photo_url) values ($1, 'Ok', $2)", [parentB, `${parentB}/p.jpg`]);
  });
});

// ---- content + exercises ------------------------------------------------------------------
const topic = (await one("select id from topics where slug = 'math-g1-u1-t2'")).id;
let ex;
await test("admin creates content; exercises must belong to a 'uebung' item and match the JSON contract", async () => {
  await as("authenticated", adminId, async () => {
    const video = await one("insert into content_items (topic_id, typ, sprache, medien_url, dauer, status) values ($1, 'video', 'ar', 'https://video.example/1', 120, 'veroeffentlicht') returning id", [topic]);
    const set = await one("insert into content_items (topic_id, typ, sprache, status) values ($1, 'uebung', 'ar', 'veroeffentlicht') returning id", [topic]);
    const draft = await one("insert into content_items (topic_id, typ, sprache, reihenfolge) values ($1, 'uebung', 'ar', 2) returning id", [topic]);
    await rejects(() => db.query("insert into exercises (content_item_id, fragetyp, daten, loesung) values ($1, 'zahl_eingeben', '{\"frage\":\"?\"}', '{\"wert\":1}')", [video.id]),
      /type uebung/, "exercise on a video");
    await rejects(() => db.query("insert into exercises (content_item_id, fragetyp, daten, loesung) values ($1, 'multiple_choice', '{\"frage\":\"?\"}', '{\"index\":0}')", [set.id]),
      /violates check constraint/, "malformed multiple choice");
    await rejects(() => db.query("insert into content_items (topic_id, typ, sprache, status) values ($1, 'video', 'fr', 'veroeffentlicht')", [topic]),
      /violates check constraint/, "published video without URL");
    const mk = (n, typ, daten, loesung, item = set.id) => one(
      "insert into exercises (content_item_id, reihenfolge, fragetyp, daten, loesung, punkte) values ($1, $2, $3, $4, $5, 2) returning id",
      [item, n, typ, JSON.stringify(daten), JSON.stringify(loesung)]);
    ex = {
      video: video.id,
      mc: (await mk(1, "multiple_choice", { frage: "٢ + ٣ = ؟", optionen: ["4", "5", "6"] }, { index: 1 })).id,
      num: (await mk(2, "zahl_eingeben", { frage: "3 + 4 = ?" }, { wert: 7 })).id,
      match: (await mk(3, "zuordnen", { links: ["1", "2"], rechts: ["deux", "un"] }, { paare: [[0, 1], [1, 0]] })).id,
      draft: (await mk(1, "zahl_eingeben", { frage: "?" }, { wert: 1 }, draft.id)).id,
    };
  });
});
await test("non-admin cannot write curriculum or content", async () => {
  await as("authenticated", parentA, async () => {
    await rejects(() => db.query("insert into topics (slug, chapter_id, reihenfolge) select 'x', id, 99 from chapters limit 1"), /row-level security/, "topic insert");
    await rejects(() => db.query("insert into content_items (topic_id, typ, sprache) values ($1, 'uebung', 'ar')", [topic]), /row-level security/, "content insert");
  });
});
await test("anonymous users read the curriculum but not content or exercises", async () => {
  await as("anon", null, async () => {
    assert.equal((await one("select count(*)::int n from topics")).n, 96);
    assert.equal((await one("select count(*)::int n from content_items")).n, 0);
    await rejects(() => db.query("select * from exercises"), /permission denied/, "exercises for anon");
  });
});
await test("parents see published content only and never the solution column", async () => {
  await as("authenticated", parentA, async () => {
    assert.equal((await rows("select id from content_items")).length, 2);        // video + published exercise set
    assert.equal((await rows("select id, daten from exercises")).length, 3);     // draft set hidden
    await rejects(() => db.query("select loesung from exercises"), /permission denied/, "select loesung");
    await rejects(() => db.query("select * from exercises"), /permission denied/, "select *");
  });
});

// ---- attempts -----------------------------------------------------------------------------
await test("submit_attempt checks answers on the server for all three question types", async () => {
  const submit = (child, id, antwort) => as("authenticated", parentA, async () =>
    (await one("select submit_attempt($1, $2, $3::jsonb) ok", [child, id, JSON.stringify(antwort)])).ok);
  assert.equal(await submit(kids[0], ex.mc, { index: 1 }), true);
  assert.equal(await submit(kids[0], ex.mc, { index: 0 }), false);
  assert.equal(await submit(kids[0], ex.num, { wert: 7 }), true);
  assert.equal(await submit(kids[0], ex.num, { wert: "sieben" }), false);   // malformed => wrong, no error
  assert.equal(await submit(kids[0], ex.match, { paare: [[1, 0], [0, 1]] }), true);   // order does not matter
  assert.equal(await submit(kids[0], ex.match, { paare: [[0, 0], [1, 1]] }), false);
  const progress = await one("select punkte::int p from progress where child_id = $1", [kids[0]]);
  assert.equal(progress.p, 6);   // three correct answers x 2 points
});
await test("attempts cannot be forged, taken for another family's child, or made on unpublished exercises", async () => {
  await as("authenticated", parentA, async () => {
    await rejects(() => db.query("insert into exercise_attempts (child_id, exercise_id, antwort, korrekt) values ($1, $2, '{}', true)", [kids[0], ex.mc]),
      /permission denied/, "direct insert");
    await rejects(() => db.query("select submit_attempt($1, $2, '{\"index\":1}')", [kids[0], ex.draft]), /not published/, "draft exercise");
  });
  await as("authenticated", parentB, () =>
    rejects(() => db.query("select submit_attempt($1, $2, '{\"index\":1}')", [kids[0], ex.mc]), /not your child/, "foreign child"));
  await as("anon", null, () =>
    rejects(() => db.query("select submit_attempt($1, $2, '{\"index\":1}')", [kids[0], ex.mc]), /permission denied/, "anon call"));
});

// ---- stars, rewards, dashboard ------------------------------------------------------------
await test("stars create rewards; parent dashboard views aggregate per child", async () => {
  await as("authenticated", parentA, async () => {
    await db.query("insert into topic_progress (child_id, topic_id, status, sterne) values ($1, $2, 'abgeschlossen', 2)", [kids[0], topic]);
    await db.query("update topic_progress set sterne = 3 where child_id = $1", [kids[0]]);
    await db.query("insert into learning_sessions (child_id, start, ende) values ($1, now() - interval '10 minutes', now())", [kids[0]]);
    const rewards = await rows("select typ, wert::int from rewards where child_id = $1 order by erhalten_am, wert", [kids[0]]);
    assert.equal(rewards.reduce((s, r) => s + r.wert, 0), 3);
    const o = await one("select topics_completed::int t, stars::int s, attempts::int a, correct::int c, correct_rate::float r from v_child_overview where child_id = $1", [kids[0]]);
    assert.deepEqual(o, { t: 1, s: 3, a: 6, c: 3, r: 50 });
    const d = await one("select attempts::int a, learning_seconds::int l from v_child_daily where child_id = $1", [kids[0]]);
    assert.equal(d.a, 6);
    assert.equal(d.l, 600);
    const w = await one("select wrong::int w, error_rate::float e from v_child_topic_errors where child_id = $1 and topic_id = $2", [kids[0], topic]);
    assert.deepEqual(w, { w: 3, e: 50 });
  });
});
await test("progress, rewards and views are invisible to other families", async () => {
  await as("authenticated", parentB, async () => {
    for (const table of ["topic_progress", "progress", "exercise_attempts", "rewards", "learning_sessions", "v_child_overview", "v_child_daily", "v_child_topic_errors"]) {
      assert.equal((await rows(`select 1 from ${table} where child_id = $1`, [kids[0]])).length, 0, table);
    }
    await rejects(() => db.query("insert into rewards (child_id, typ) values ($1, 'stern')", [kids[0]]), /permission denied/, "forged reward");
  });
});

// ---- billing ------------------------------------------------------------------------------
await test("subscriptions and payments are read-only for clients", async () => {
  const plan = (await one("select id from plans where slug = 'pilot'")).id;
  const sub = await one("insert into subscriptions (user_id, plan_id) values ($1, $2) returning id", [parentA, plan]);
  await db.query("insert into payments (subscription_id, anbieter, betrag, referenz) values ($1, 'manual', 0, 'r1')", [sub.id]);
  await as("authenticated", parentA, async () => {
    assert.equal((await rows("select 1 from subscriptions")).length, 1);
    assert.equal((await rows("select 1 from payments")).length, 1);
    await rejects(() => db.query("insert into subscriptions (user_id, plan_id) values ($1, $2)", [parentA, plan]), /permission denied/, "self-subscribe");
    await rejects(() => db.query("update payments set status = 'bezahlt'"), /permission denied/, "mark paid");
  });
  await as("authenticated", parentB, async () => {
    assert.equal((await rows("select 1 from subscriptions")).length, 0);
    assert.equal((await rows("select 1 from payments")).length, 0);
  });
  await rejects(() => db.query("insert into payments (subscription_id, anbieter, betrag, referenz) values ($1, 'manual', 0, 'r1')", [sub.id]),
    /duplicate key/, "duplicate provider reference");
});

// ---- storage ------------------------------------------------------------------------------
await test("child photos: only the parent's own folder is accessible", async () => {
  await as("authenticated", parentA, async () => {
    await db.query("insert into storage.objects (bucket_id, name) values ('child-photos', $1)", [`${parentA}/salma.jpg`]);
    await rejects(() => db.query("insert into storage.objects (bucket_id, name) values ('child-photos', $1)", [`${parentB}/x.jpg`]),
      /row-level security/, "upload into foreign folder");
  });
  await as("authenticated", parentB, async () =>
    assert.equal((await rows("select 1 from storage.objects where bucket_id = 'child-photos'")).length, 0));
  await as("anon", null, async () =>
    assert.equal((await rows("select 1 from storage.objects where bucket_id = 'child-photos'")).length, 0));
});

const parentBChild = (await one("select id from child_profiles where parent_user_id = $1 limit 1", [parentB])).id;

// ---- learning flow (demo content) ---------------------------------------------------------
await db.exec(readFileSync(join(root, "demo-content.sql"), "utf8"));
const t4 = (await one("select id from topics where slug = 'math-g1-u1-t3'")).id;   // numbers 1 to 5
const frExercises = (await rows(`select e.id, e.fragetyp from exercises e join content_items ci on ci.id = e.content_item_id
  where ci.topic_id = $1 and ci.sprache = 'fr' order by e.reihenfolge`, [t4]));
const answers = { 0: { index: 1 }, 1: { wert: 3 }, 2: { paare: [[0, 1], [1, 2], [2, 0]] }, 3: { index: 1 } };
const wrong = { 0: { index: 0 }, 1: { wert: 9 }, 2: { paare: [[0, 0], [1, 1], [2, 2]] }, 3: { index: 0 } };
const answerAll = (child, set, only = frExercises.length, sub = parentA) => as("authenticated", sub, async () => {
  for (const [i, e] of frExercises.slice(0, only).entries())
    await db.query("select submit_attempt($1, $2, $3::jsonb)", [child, e.id, JSON.stringify(set[i])]);
});
const finish = (child, topicId, sub = parentA) => as("authenticated", sub, async () =>
  (await one("select finish_topic_practice($1, $2) r", [child, topicId])).r);

await test("finishing a topic: partial answers do not complete it", async () => {
  await answerAll(kids[1], answers, 2);
  const r = await finish(kids[1], t4);
  assert.deepEqual([r.total, r.answered, r.completed, r.stars], [4, 2, false, 0]);
  assert.equal((await rows("select 1 from topic_progress where child_id = $1", [kids[1]])).length, 0);
});
await test("finishing a topic: all correct = 3 stars, completed, rewards created", async () => {
  await answerAll(kids[1], answers);
  const r = await finish(kids[1], t4);
  assert.deepEqual([r.total, r.correct, r.stars, r.best_stars, r.completed], [4, 4, 3, 3, true]);
  const tp = await one("select status, sterne::int s from topic_progress where child_id = $1 and topic_id = $2", [kids[1], t4]);
  assert.deepEqual(tp, { status: "abgeschlossen", s: 3 });
  assert.equal((await one("select sum(wert)::int s from rewards where child_id = $1", [kids[1]])).s, 3);
});
await test("a worse retry never takes stars away", async () => {
  await answerAll(kids[1], wrong);
  const r = await finish(kids[1], t4);
  assert.deepEqual([r.correct, r.stars, r.best_stars], [0, 0, 3]);
  assert.equal((await one("select sterne::int s from topic_progress where child_id = $1 and topic_id = $2", [kids[1], t4])).s, 3);
});
await test("star thresholds: 3/4 correct = 2 stars, 2/4 = 1 star, 1/4 = 0 stars and not completed", async () => {
  const stars = async (child, correctCount, sub = parentA) => {
    const mix = Object.fromEntries(frExercises.map((_, i) => [i, i < correctCount ? answers[i] : wrong[i]]));
    await answerAll(child, mix, frExercises.length, sub);
    return finish(child, t4, sub);
  };
  assert.equal((await stars(kids[2], 3)).stars, 2);
  assert.equal((await one("select sterne::int s from topic_progress where child_id = $1", [kids[2]])).s, 2);
  const half = await stars(kids[0], 2);
  assert.deepEqual([half.stars, half.completed], [1, true]);
  // a child without earlier stars: parent B's child, temporarily learning in French
  await db.query("update child_profiles set sprache = 'fr' where id = $1", [parentBChild]);
  const low = await stars(parentBChild, 1, parentB);
  assert.deepEqual([low.stars, low.completed], [0, false]);
  await db.query("update child_profiles set sprache = 'ar' where id = $1", [parentBChild]);
  await db.query("delete from exercise_attempts where child_id = $1", [parentBChild]);
});
await test("finish_topic_practice only counts exercises in the child's learning language", async () => {
  const arChild = parentBChild;   // created with the default language 'ar'
  const r = await finish(arChild, t4, parentB);
  assert.equal(r.total, 4);        // the 4 Arabic exercises, none answered yet by this child
  assert.equal(r.answered, 0);
});
await test("finish_topic_practice and track_learning reject foreign children", async () => {
  await rejects(() => finish(kids[0], t4, parentB), /not your child/, "finish for foreign child");
  await as("authenticated", parentB, () =>
    rejects(() => db.query("select track_learning($1)", [kids[0]]), /not your child/, "track for foreign child"));
  await as("anon", null, () =>
    rejects(() => db.query("select track_learning($1)", [kids[0]]), /permission denied/, "anon track"));
});
await test("track_learning extends a session within 5 minutes and starts a new one after a gap", async () => {
  const track = () => as("authenticated", parentA, () => db.query("select track_learning($1)", [kids[2]]));
  await db.query("delete from learning_sessions where child_id = $1", [kids[2]]);
  await track();
  await track();
  assert.equal((await rows("select 1 from learning_sessions where child_id = $1", [kids[2]])).length, 1);
  await db.query("update learning_sessions set start = now() - interval '20 minutes', ende = now() - interval '10 minutes' where child_id = $1", [kids[2]]);
  await track();
  const sessions = await rows("select dauer::int d from learning_sessions where child_id = $1 order by start", [kids[2]]);
  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].d, 600);
});

// ---- admin area -----------------------------------------------------------------------------
await test("admin can read an exercise solution, parents and anon cannot", async () => {
  const id = ex.mc;
  const sol = await as("authenticated", adminId, async () => (await one("select (admin_exercise($1)).loesung l", [id])).l);
  assert.deepEqual(sol, { index: 1 });
  await as("authenticated", parentA, () => rejects(() => db.query("select admin_exercise($1)", [id]), /admins only/, "parent"));
  await as("anon", null, () => rejects(() => db.query("select admin_exercise($1)", [id]), /permission denied/, "anon"));
});
await test("admin can edit exercises, translations and see drafts; the review marks a translation as reviewed", async () => {
  await as("authenticated", adminId, async () => {
    await db.query("update exercises set punkte = 3 where id = $1", [ex.num]);
    assert.equal((await one("select punkte::int p from exercises where id = $1", [ex.num])).p, 3);
    assert.equal((await rows("select id from content_items where status = 'entwurf'")).length >= 1, true);
    await db.query("update translations set text = 'Les nombres', quality = 'reviewed' where entity_type = 'topic' and entity_id = $1 and sprache = 'fr'", [topic]);
  });
  assert.equal((await one("select quality q from translations where entity_type = 'topic' and entity_id = $1 and sprache = 'fr'", [topic])).q, "reviewed");
  await as("authenticated", parentA, async () => {
    await db.query("update translations set text = 'hacked' where entity_type = 'topic' and entity_id = $1", [topic]);   // RLS: silently 0 rows
    assert.notEqual((await one("select text t from translations where entity_type = 'topic' and entity_id = $1 and sprache = 'fr'", [topic])).t, "hacked");
  });
});
await test("dashboard views only return the signed-in parent's children", async () => {
  const today = await as("authenticated", parentA, () => rows("select child_id from v_child_overview"));
  assert.equal(today.length, 3);
  await as("authenticated", parentB, async () => assert.equal((await rows("select child_id from v_child_overview")).length, 1));
});

// ---- cleanup behaviour --------------------------------------------------------------------
await test("deleting a chapter removes its topics and their translations", async () => {
  const before = (await one("select count(*)::int n from translations")).n;
  await db.query("delete from chapters where slug = 'math-g3-u6'");
  const after = (await one("select count(*)::int n from translations")).n;
  assert.equal((await one("select count(*)::int n from topics where slug like 'math-g3-u6-%'")).n, 0);
  // chapter label + title (4 rows) + 8 topics x 2 languages (16 rows)
  assert.equal(before - after, 20);
});

console.log(`\n${passed} checks passed${process.exitCode ? ", some FAILED" : ""}`);
await db.close();
