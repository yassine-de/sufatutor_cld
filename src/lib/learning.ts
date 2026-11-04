import { cache } from "react";
import type { Locale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";

// Read side of the learning area: curriculum tree, per-child stars, topic content.
// Everything runs as the signed-in parent, so RLS decides what is visible.

export type TopicNode = {
  id: string;
  slug: string;
  reihenfolge: number;
  title: string;
  domain: "number" | "geometry" | "measure" | "data" | null;
  sterne: number;
  done: boolean;
};

export type ChapterNode = {
  id: string;
  slug: string;
  reihenfolge: number;
  semester: number | null;
  label: string;
  title: string;
  topics: TopicNode[];
};

export type ExerciseView = {
  id: string;
  fragetyp: "multiple_choice" | "zahl_eingeben" | "zuordnen";
  daten: Record<string, unknown>;
};

type Row = Record<string, unknown>;

// Text for entities in the wanted language, falling back to Arabic (the curriculum's own language).
export async function translationTexts(entityType: string, ids: string[], fields: string[], lang: Locale) {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("translations")
    .select("entity_id, sprache, feld, text")
    .eq("entity_type", entityType)
    .in("feld", fields)
    .in("sprache", lang === "ar" ? ["ar"] : [lang, "ar"])
    .in("entity_id", ids);
  // Arabic first so that the requested language overwrites it when both exist.
  const rows = (data ?? []) as Row[];
  [...rows.filter((r) => r.sprache === "ar"), ...rows.filter((r) => r.sprache !== "ar")].forEach((r) =>
    map.set(`${r.entity_id}:${r.feld}`, r.text as string),
  );
  return map;
}

export const getMathChapters = cache(
  async (gradeNumber: number, lang: Locale, childId: string | null): Promise<ChapterNode[] | null> => {
    const supabase = await createClient();

    const [{ data: grade }, { data: subject }] = await Promise.all([
      supabase.from("grades").select("id").eq("stufe", "primaire").eq("nummer", gradeNumber).maybeSingle(),
      supabase.from("subjects").select("id").eq("code", "math").maybeSingle(),
    ]);
    if (!grade || !subject) return null;

    const { data: chapterRows } = await supabase
      .from("chapters")
      .select("id, slug, reihenfolge, semester")
      .eq("grade_id", grade.id)
      .eq("subject_id", subject.id)
      .order("reihenfolge");
    const chapters = (chapterRows ?? []) as Row[];
    const chapterIds = chapters.map((c) => c.id as string);

    const { data: topicRows } = await supabase
      .from("topics")
      .select("id, slug, chapter_id, reihenfolge, domain")
      .in("chapter_id", chapterIds)
      .order("reihenfolge");
    const topics = (topicRows ?? []) as Row[];
    const topicIds = topics.map((t) => t.id as string);

    const [chapterText, topicText, { data: progressRows }] = await Promise.all([
      translationTexts("chapter", chapterIds, ["label", "title"], lang),
      translationTexts("topic", topicIds, ["title"], lang),
      childId
        ? supabase.from("topic_progress").select("topic_id, sterne, status").eq("child_id", childId)
        : Promise.resolve({ data: [] as Row[] }),
    ]);
    const progress = new Map(((progressRows ?? []) as Row[]).map((p) => [p.topic_id as string, p]));

    return chapters.map((c) => ({
      id: c.id as string,
      slug: c.slug as string,
      reihenfolge: c.reihenfolge as number,
      semester: c.semester as number | null,
      label: chapterText.get(`${c.id}:label`) ?? "",
      title: chapterText.get(`${c.id}:title`) ?? "",
      topics: topics
        .filter((t) => t.chapter_id === c.id)
        .map((t) => {
          const p = progress.get(t.id as string);
          return {
            id: t.id as string,
            slug: t.slug as string,
            reihenfolge: t.reihenfolge as number,
            title: topicText.get(`${t.id}:title`) ?? "",
            domain: t.domain as TopicNode["domain"],
            sterne: (p?.sterne as number | undefined) ?? 0,
            done: p?.status === "abgeschlossen",
          };
        }),
    }));
  },
);

export type TopicPage = {
  id: string;
  slug: string;
  title: string;
  chapterLabel: string;
  chapterTitle: string;
  gradeNumber: number;
  siblings: { prev: { slug: string; title: string } | null; next: { slug: string; title: string } | null };
  sterne: number;
  video: { id: string; url: string } | null;
  exercises: { count: number } | null;
  worksheet: { signedUrl: string } | null;
};

// One topic with everything its page needs. Content is picked in the child's learning language.
export async function getTopicPage(slug: string, lang: Locale, contentLang: Locale, childId: string): Promise<TopicPage | null> {
  const supabase = await createClient();

  const { data: topic } = await supabase
    .from("topics")
    .select("id, slug, chapter_id, reihenfolge")
    .eq("slug", slug)
    .maybeSingle();
  if (!topic) return null;

  const { data: chapter } = await supabase
    .from("chapters")
    .select("id, grade_id")
    .eq("id", topic.chapter_id)
    .single();
  const [{ data: grade }, { data: siblingRows }, { data: items }, { data: progress }] = await Promise.all([
    supabase.from("grades").select("nummer").eq("id", chapter?.grade_id).single(),
    supabase.from("topics").select("id, slug, reihenfolge").eq("chapter_id", topic.chapter_id).order("reihenfolge"),
    supabase
      .from("content_items")
      .select("id, typ, medien_url, reihenfolge")
      .eq("topic_id", topic.id)
      .eq("sprache", contentLang)
      .order("reihenfolge"),
    supabase.from("topic_progress").select("sterne").eq("child_id", childId).eq("topic_id", topic.id).maybeSingle(),
  ]);

  const siblings = (siblingRows ?? []) as Row[];
  const at = siblings.findIndex((s) => s.id === topic.id);
  const neighbourIds = [siblings[at - 1]?.id, siblings[at + 1]?.id].filter(Boolean) as string[];

  const [topicText, chapterText, neighbourText] = await Promise.all([
    translationTexts("topic", [topic.id], ["title"], lang),
    translationTexts("chapter", [topic.chapter_id], ["label", "title"], lang),
    translationTexts("topic", neighbourIds, ["title"], lang),
  ]);
  const neighbour = (i: number) => {
    const s = siblings[i];
    return s ? { slug: s.slug as string, title: neighbourText.get(`${s.id}:title`) ?? "" } : null;
  };

  const contentItems = (items ?? []) as Row[];
  const video = contentItems.find((i) => i.typ === "video" && i.medien_url);
  const sheet = contentItems.find((i) => i.typ === "arbeitsblatt" && i.medien_url);
  const exerciseItemIds = contentItems.filter((i) => i.typ === "uebung").map((i) => i.id as string);

  let exerciseCount = 0;
  if (exerciseItemIds.length > 0) {
    const { count } = await supabase
      .from("exercises")
      .select("id", { count: "exact", head: true })
      .in("content_item_id", exerciseItemIds);
    exerciseCount = count ?? 0;
  }

  // Worksheets live in the private bucket: short-lived signed link.
  let worksheet: TopicPage["worksheet"] = null;
  if (sheet) {
    const { data } = await supabase.storage.from("worksheets").createSignedUrl(sheet.medien_url as string, 60 * 60);
    if (data?.signedUrl) worksheet = { signedUrl: data.signedUrl };
  }

  return {
    id: topic.id,
    slug: topic.slug,
    title: topicText.get(`${topic.id}:title`) ?? "",
    chapterLabel: chapterText.get(`${topic.chapter_id}:label`) ?? "",
    chapterTitle: chapterText.get(`${topic.chapter_id}:title`) ?? "",
    gradeNumber: grade?.nummer ?? 1,
    siblings: { prev: neighbour(at - 1), next: neighbour(at + 1) },
    sterne: (progress?.sterne as number | undefined) ?? 0,
    video: video ? { id: video.id as string, url: video.medien_url as string } : null,
    exercises: exerciseCount > 0 ? { count: exerciseCount } : null,
    worksheet,
  };
}

export async function getExercises(topicId: string, contentLang: Locale): Promise<ExerciseView[]> {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("content_items")
    .select("id, reihenfolge")
    .eq("topic_id", topicId)
    .eq("typ", "uebung")
    .eq("sprache", contentLang)
    .order("reihenfolge");
  const itemIds = ((items ?? []) as Row[]).map((i) => i.id as string);
  if (itemIds.length === 0) return [];

  // The solution column is not selectable by clients, only the question data is.
  const { data } = await supabase
    .from("exercises")
    .select("id, content_item_id, reihenfolge, fragetyp, daten")
    .in("content_item_id", itemIds);
  const order = new Map(itemIds.map((id, i) => [id, i]));
  return ((data ?? []) as Row[])
    .sort((a, b) =>
      (order.get(a.content_item_id as string)! - order.get(b.content_item_id as string)!) ||
      ((a.reihenfolge as number) - (b.reihenfolge as number)))
    .map((e) => ({ id: e.id as string, fragetyp: e.fragetyp as ExerciseView["fragetyp"], daten: e.daten as Record<string, unknown> }));
}
