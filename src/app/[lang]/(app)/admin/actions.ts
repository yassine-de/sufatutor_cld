"use server";

import { redirect } from "next/navigation";
import { defaultLocale, hasLocale, locales, type Locale } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin";
import { parseNumber } from "@/lib/number";
import { createClient } from "@/lib/supabase/server";

// Every action re-checks the admin role (the page check is only a convenience) and the database
// enforces it again through RLS. Nothing here trusts what the browser sends.

export type AdminState = { error?: boolean; saved?: boolean } | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const safeLang = (lang: string): Locale => (hasLocale(lang) ? lang : defaultLocale);
const field = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const fields = (fd: FormData, key: string) => fd.getAll(key).map((v) => String(v).trim());
const FAIL: AdminState = { error: true };
const OK: AdminState = { saved: true };

async function admin(lang: string) {
  await requireAdmin(safeLang(lang));
  return createClient();
}

const contentLang = (value: string): "ar" | "fr" | null => (value === "ar" || value === "fr" ? value : null);
const status = (value: string) => (value === "veroeffentlicht" ? "veroeffentlicht" : "entwurf");

// ---- topics --------------------------------------------------------------------------------

export async function saveTitles(lang: string, topicId: string, _prev: AdminState, fd: FormData): Promise<AdminState> {
  const supabase = await admin(lang);
  if (!UUID.test(topicId)) return FAIL;

  const rows = locales.map((l) => ({
    entity_type: "topic", entity_id: topicId, sprache: l, feld: "title", text: field(fd, `title_${l}`), quality: "reviewed",
  }));
  if (rows.some((r) => r.text.length < 1 || r.text.length > 200)) return FAIL;

  const { error } = await supabase.from("translations").upsert(rows, { onConflict: "entity_type,entity_id,sprache,feld" });
  return error ? FAIL : OK;
}

export async function createTopic(lang: string, chapterId: string, fd: FormData) {
  const supabase = await admin(lang);
  const ar = field(fd, "title_ar");
  const fr = field(fd, "title_fr");
  const week = Number(field(fd, "week")) || null;
  const domain = ["number", "geometry", "measure", "data"].includes(field(fd, "domain")) ? field(fd, "domain") : null;
  if (!UUID.test(chapterId) || !ar || !fr) return;

  const { data: chapter } = await supabase.from("chapters").select("slug").eq("id", chapterId).single();
  const { data: last } = await supabase.from("topics").select("reihenfolge").eq("chapter_id", chapterId).order("reihenfolge", { ascending: false }).limit(1);
  if (!chapter) return;

  const order = ((last?.[0]?.reihenfolge as number | undefined) ?? 0) + 1;
  const slug = `${chapter.slug}-t${order}`;
  const { data: topic, error } = await supabase.from("topics").insert({ slug, chapter_id: chapterId, reihenfolge: order, week, domain }).select("id").single();
  if (error || !topic) return;

  await supabase.from("translations").insert(
    locales.map((l) => ({ entity_type: "topic", entity_id: topic.id, sprache: l, feld: "title", text: l === "ar" ? ar : fr, quality: "reviewed" })),
  );
  redirect(`/${safeLang(lang)}/admin/topics/${slug}`);
}

export async function deleteTopic(lang: string, topicId: string) {
  const supabase = await admin(lang);
  if (UUID.test(topicId)) await supabase.from("topics").delete().eq("id", topicId);
  redirect(`/${safeLang(lang)}/admin`);
}

// ---- video, worksheet, exercise set ----------------------------------------------------------

async function topicContent(supabase: Awaited<ReturnType<typeof admin>>, topicId: string, sprache: string, typ: string) {
  const { data } = await supabase.from("content_items").select("id, medien_url").eq("topic_id", topicId).eq("sprache", sprache).eq("typ", typ).eq("reihenfolge", 1).maybeSingle();
  return data as { id: string; medien_url: string | null } | null;
}

export async function saveVideo(lang: string, topicId: string, sprache: string, _prev: AdminState, fd: FormData): Promise<AdminState> {
  const supabase = await admin(lang);
  const l = contentLang(sprache);
  if (!UUID.test(topicId) || !l) return FAIL;

  const url = field(fd, "url");
  const existing = await topicContent(supabase, topicId, l, "video");
  if (!url) {
    if (existing) await supabase.from("content_items").delete().eq("id", existing.id);
    return OK;
  }
  // Same rule as the player: https only (Bunny Stream embeds or direct mp4/webm files).
  if (!/^https:\/\/\S+$/.test(url) || url.length > 500) return FAIL;
  const duration = field(fd, "dauer") ? Math.round(Number(field(fd, "dauer"))) : null;
  if (duration !== null && (!Number.isFinite(duration) || duration < 0)) return FAIL;

  const { error } = await supabase.from("content_items").upsert(
    { topic_id: topicId, typ: "video", sprache: l, reihenfolge: 1, medien_url: url, dauer: duration, status: status(field(fd, "status")) },
    { onConflict: "topic_id,typ,sprache,reihenfolge" },
  );
  return error ? FAIL : OK;
}

// The PDF itself is uploaded from the browser (admin policy on the 'worksheets' bucket);
// this records where it is. path = null removes the worksheet.
export async function saveWorksheet(lang: string, topicId: string, sprache: string, path: string | null, publish: boolean): Promise<AdminState> {
  const supabase = await admin(lang);
  const l = contentLang(sprache);
  if (!UUID.test(topicId) || !l) return FAIL;

  const existing = await topicContent(supabase, topicId, l, "arbeitsblatt");
  if (path === null) {
    if (existing?.medien_url) await supabase.storage.from("worksheets").remove([existing.medien_url]);
    if (existing) await supabase.from("content_items").delete().eq("id", existing.id);
    return OK;
  }
  if (path !== `${topicId}/${l}.pdf`) return FAIL;
  const { error } = await supabase.from("content_items").upsert(
    { topic_id: topicId, typ: "arbeitsblatt", sprache: l, reihenfolge: 1, medien_url: path, status: publish ? "veroeffentlicht" : "entwurf" },
    { onConflict: "topic_id,typ,sprache,reihenfolge" },
  );
  return error ? FAIL : OK;
}

export async function setExerciseStatus(lang: string, topicId: string, sprache: string, fd: FormData) {
  const supabase = await admin(lang);
  const l = contentLang(sprache);
  if (!UUID.test(topicId) || !l) return;
  const item = await topicContent(supabase, topicId, l, "uebung");
  if (item) await supabase.from("content_items").update({ status: status(field(fd, "status")) }).eq("id", item.id);
}

// ---- exercises -------------------------------------------------------------------------------

type Built = { fragetyp: "multiple_choice" | "zahl_eingeben" | "zuordnen"; daten: object; loesung: object };

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Turns the editor form into the JSON stored in the database (contract: migration 1).
function buildExercise(fd: FormData): Built | null {
  const type = field(fd, "fragetyp");
  const frage = field(fd, "frage");

  if (type === "multiple_choice") {
    const options = fields(fd, "option");
    const correct = Number(field(fd, "correct"));
    if (!frage || options.length < 2 || options.length > 6 || options.some((o) => !o)) return null;
    if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) return null;
    return { fragetyp: type, daten: { frage, optionen: options }, loesung: { index: correct } };
  }
  if (type === "zahl_eingeben") {
    const value = parseNumber(field(fd, "wert"));
    if (!frage || value === null) return null;
    const unit = field(fd, "einheit");
    return { fragetyp: type, daten: unit ? { frage, einheit: unit } : { frage }, loesung: { wert: value } };
  }
  if (type === "zuordnen") {
    const lefts = fields(fd, "left");
    const rights = fields(fd, "right");
    if (lefts.length < 2 || lefts.length > 6 || lefts.length !== rights.length) return null;
    if ([...lefts, ...rights].some((x) => !x)) return null;
    // Authors enter the correct pairs; the right-hand column is shuffled for the child.
    let order = rights.map((_, i) => i);
    for (let attempt = 0; attempt < 20; attempt++) {
      order = shuffled(order);
      if (order.some((v, i) => v !== i)) break; // not the identity, or the answer would be obvious
    }
    const shownRights = order.map((i) => rights[i]);
    const paare = lefts.map((_, i) => [i, order.indexOf(i)]);
    return { fragetyp: type, daten: { links: lefts, rechts: shownRights }, loesung: { paare } };
  }
  return null;
}

export async function saveExercise(
  lang: string, topicId: string, sprache: string, exerciseId: string | null, _prev: AdminState, fd: FormData,
): Promise<AdminState> {
  const supabase = await admin(lang);
  const l = contentLang(sprache);
  const built = buildExercise(fd);
  const points = Math.min(10, Math.max(1, Math.round(Number(field(fd, "punkte")) || 1)));
  if (!UUID.test(topicId) || !l || !built || (exerciseId && !UUID.test(exerciseId))) return FAIL;

  // First exercise of a language creates the (draft) exercise set.
  let item = await topicContent(supabase, topicId, l, "uebung");
  if (!item) {
    const { data } = await supabase.from("content_items").insert({ topic_id: topicId, typ: "uebung", sprache: l, status: "entwurf" }).select("id").single();
    if (!data) return FAIL;
    item = { id: data.id as string, medien_url: null };
  }

  if (exerciseId) {
    const { error } = await supabase.from("exercises").update({ ...built, punkte: points }).eq("id", exerciseId).eq("content_item_id", item.id);
    if (error) return FAIL;
  } else {
    const { data: last } = await supabase.from("exercises").select("reihenfolge").eq("content_item_id", item.id).order("reihenfolge", { ascending: false }).limit(1);
    const order = ((last?.[0]?.reihenfolge as number | undefined) ?? 0) + 1;
    const { error } = await supabase.from("exercises").insert({ content_item_id: item.id, reihenfolge: order, punkte: points, ...built });
    if (error) return FAIL;
  }
  const { data: topic } = await supabase.from("topics").select("slug").eq("id", topicId).single();
  redirect(`/${safeLang(lang)}/admin/topics/${topic?.slug ?? ""}`);
}

export async function deleteExercise(lang: string, topicId: string, exerciseId: string) {
  const supabase = await admin(lang);
  if (UUID.test(exerciseId)) await supabase.from("exercises").delete().eq("id", exerciseId);
  const { data: topic } = await supabase.from("topics").select("slug").eq("id", topicId).single();
  redirect(`/${safeLang(lang)}/admin/topics/${topic?.slug ?? ""}`);
}

// ---- translations ----------------------------------------------------------------------------

export async function reviewTranslation(lang: string, fd: FormData) {
  const supabase = await admin(lang);
  const id = field(fd, "entity_id");
  const type = field(fd, "entity_type");
  const sprache = field(fd, "sprache");
  const feld = field(fd, "feld");
  const text = field(fd, "text");
  if (!UUID.test(id) || !text || text.length > 500 || !["ar", "fr", "darija"].includes(sprache)) return;

  await supabase.from("translations").update({ text, quality: "reviewed" })
    .eq("entity_type", type).eq("entity_id", id).eq("sprache", sprache).eq("feld", feld);
}
