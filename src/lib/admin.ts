import { cache } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Row = Record<string, unknown>;

// True when the signed-in user has the admin role. This only decides what the UI shows:
// the database enforces the same rule (RLS policies use is_admin()).
export const isAdmin = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data } = await supabase.from("users").select("rolle").eq("id", auth.user.id).maybeSingle();
  return data?.rolle === "admin";
});

// For admin pages and actions: not signed in -> login, signed in but no admin -> 404.
export async function requireAdmin(lang: string) {
  await requireUser(lang);
  if (!(await isAdmin())) notFound();
}

export type ContentSummary = {
  video: "entwurf" | "veroeffentlicht" | null;
  exercises: { status: "entwurf" | "veroeffentlicht"; count: number } | null;
  worksheet: "entwurf" | "veroeffentlicht" | null;
};

// Which content exists per topic and language (drafts included: admins can read them).
export async function getContentSummary(topicIds: string[]): Promise<Map<string, Record<"ar" | "fr", ContentSummary>>> {
  const result = new Map<string, Record<"ar" | "fr", ContentSummary>>();
  const empty = (): ContentSummary => ({ video: null, exercises: null, worksheet: null });
  topicIds.forEach((id) => result.set(id, { ar: empty(), fr: empty() }));
  if (topicIds.length === 0) return result;

  const supabase = await createClient();
  const { data: items } = await supabase.from("content_items").select("id, topic_id, typ, sprache, status").in("topic_id", topicIds);
  const rows = (items ?? []) as Row[];
  const setIds = rows.filter((r) => r.typ === "uebung").map((r) => r.id as string);
  const counts = new Map<string, number>();
  if (setIds.length > 0) {
    const { data: ex } = await supabase.from("exercises").select("content_item_id").in("content_item_id", setIds);
    ((ex ?? []) as Row[]).forEach((e) => counts.set(e.content_item_id as string, (counts.get(e.content_item_id as string) ?? 0) + 1));
  }

  for (const r of rows) {
    const lang = r.sprache as "ar" | "fr";
    const entry = result.get(r.topic_id as string)?.[lang];
    if (!entry) continue; // 'darija' content is not offered in the UI yet
    const status = r.status as "entwurf" | "veroeffentlicht";
    if (r.typ === "video") entry.video = status;
    else if (r.typ === "arbeitsblatt") entry.worksheet = status;
    else entry.exercises = { status, count: counts.get(r.id as string) ?? 0 };
  }
  return result;
}

export type EditorLang = {
  video: { url: string; dauer: number | null; status: "entwurf" | "veroeffentlicht" } | null;
  worksheet: { path: string; status: "entwurf" | "veroeffentlicht" } | null;
  exerciseSet: { status: "entwurf" | "veroeffentlicht"; exercises: { id: string; fragetyp: string; frage: string; punkte: number }[] } | null;
};

export type TopicEditorData = {
  id: string;
  slug: string;
  titles: Record<"ar" | "fr", string>;
  gradeNumber: number;
  content: Record<"ar" | "fr", EditorLang>;
};

// Everything the topic editor shows. Exercises are listed without their solution; the solution
// is only fetched for the single exercise being edited (admin_exercise).
export async function getTopicEditorData(slug: string): Promise<TopicEditorData | null> {
  const supabase = await createClient();
  const { data: topic } = await supabase.from("topics").select("id, slug, chapter_id").eq("slug", slug).maybeSingle();
  if (!topic) return null;

  const [{ data: chapter }, { data: titleRows }, { data: items }] = await Promise.all([
    supabase.from("chapters").select("grade_id").eq("id", topic.chapter_id).single(),
    supabase.from("translations").select("sprache, text").eq("entity_type", "topic").eq("entity_id", topic.id).eq("feld", "title"),
    supabase.from("content_items").select("id, typ, sprache, medien_url, dauer, status").eq("topic_id", topic.id),
  ]);
  const { data: grade } = await supabase.from("grades").select("nummer").eq("id", chapter?.grade_id).single();

  const itemRows = (items ?? []) as Row[];
  const setIds = itemRows.filter((i) => i.typ === "uebung").map((i) => i.id as string);
  const { data: exerciseRows } = setIds.length
    ? await supabase.from("exercises").select("id, content_item_id, reihenfolge, fragetyp, daten, punkte").in("content_item_id", setIds).order("reihenfolge")
    : { data: [] as Row[] };

  const titles = { ar: "", fr: "" };
  ((titleRows ?? []) as Row[]).forEach((r) => {
    if (r.sprache === "ar" || r.sprache === "fr") titles[r.sprache] = r.text as string;
  });

  const content = {} as TopicEditorData["content"];
  for (const l of ["ar", "fr"] as const) {
    const mine = itemRows.filter((i) => i.sprache === l);
    const video = mine.find((i) => i.typ === "video");
    const sheet = mine.find((i) => i.typ === "arbeitsblatt");
    const set = mine.find((i) => i.typ === "uebung");
    content[l] = {
      video: video ? { url: (video.medien_url as string) ?? "", dauer: video.dauer as number | null, status: video.status as "entwurf" | "veroeffentlicht" } : null,
      worksheet: sheet ? { path: sheet.medien_url as string, status: sheet.status as "entwurf" | "veroeffentlicht" } : null,
      exerciseSet: set
        ? {
            status: set.status as "entwurf" | "veroeffentlicht",
            exercises: ((exerciseRows ?? []) as Row[])
              .filter((e) => e.content_item_id === set.id)
              .map((e) => ({
                id: e.id as string,
                fragetyp: e.fragetyp as string,
                frage: String((e.daten as Row)?.frage ?? ((e.daten as Row)?.links ? "↔" : "")),
                punkte: e.punkte as number,
              })),
          }
        : null,
    };
  }
  return { id: topic.id, slug: topic.slug, titles, gradeNumber: grade?.nummer ?? 1, content };
}
