import type { Locale } from "@/i18n/config";
import { translationTexts } from "@/lib/learning";
import { createClient } from "@/lib/supabase/server";

// Data for the parent dashboard (KONZEPT.md §10). It reads the views from migration 3, which
// run with the caller's rights: a parent can only ever load their own children.

const TZ = "Africa/Casablanca"; // days are Moroccan local days, like the database views

export type DayStats = {
  day: string; // YYYY-MM-DD
  topicsCompleted: number;
  videosWatched: number;
  attempts: number;
  correct: number;
  learningSeconds: number;
};

export type WeakTopic = { topicId: string; slug: string; title: string; attempts: number; wrong: number };

export type ChildDashboard = {
  topicsCompleted: number;
  stars: number;
  attempts: number;
  correctRate: number | null;
  today: DayStats;
  week: DayStats[]; // oldest first, always 7 entries
  weak: WeakTopic[];
};

const dayKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(date);

type Row = Record<string, unknown>;

export async function getChildDashboard(childId: string, lang: Locale): Promise<ChildDashboard> {
  const supabase = await createClient();

  const now = new Date();
  const days = Array.from({ length: 7 }, (_, i) => dayKey(new Date(now.getTime() - (6 - i) * 86_400_000)));

  const [{ data: overview }, { data: daily }, { data: errors }] = await Promise.all([
    supabase.from("v_child_overview").select("topics_completed, stars, attempts, correct_rate").eq("child_id", childId).maybeSingle(),
    supabase
      .from("v_child_daily")
      .select("day, topics_completed, videos_watched, attempts, correct, learning_seconds")
      .eq("child_id", childId)
      .gte("day", days[0]),
    // Weak spots: enough answers to mean something, and at least one mistake.
    supabase
      .from("v_child_topic_errors")
      .select("topic_id, attempts, wrong, error_rate")
      .eq("child_id", childId)
      .gte("attempts", 3)
      .gt("wrong", 0)
      .order("error_rate", { ascending: false })
      .order("attempts", { ascending: false })
      .limit(5),
  ]);

  const byDay = new Map(((daily ?? []) as Row[]).map((r) => [String(r.day), r]));
  const week: DayStats[] = days.map((day) => {
    const r = byDay.get(day);
    return {
      day,
      topicsCompleted: Number(r?.topics_completed ?? 0),
      videosWatched: Number(r?.videos_watched ?? 0),
      attempts: Number(r?.attempts ?? 0),
      correct: Number(r?.correct ?? 0),
      learningSeconds: Number(r?.learning_seconds ?? 0),
    };
  });

  const weakRows = (errors ?? []) as Row[];
  const topicIds = weakRows.map((e) => e.topic_id as string);
  const [titles, { data: topics }] = await Promise.all([
    translationTexts("topic", topicIds, ["title"], lang),
    topicIds.length > 0 ? supabase.from("topics").select("id, slug").in("id", topicIds) : Promise.resolve({ data: [] as Row[] }),
  ]);
  const slugs = new Map(((topics ?? []) as Row[]).map((t) => [t.id as string, t.slug as string]));

  return {
    topicsCompleted: Number(overview?.topics_completed ?? 0),
    stars: Number(overview?.stars ?? 0),
    attempts: Number(overview?.attempts ?? 0),
    correctRate: overview?.correct_rate === null || overview?.correct_rate === undefined ? null : Number(overview.correct_rate),
    today: week[6],
    week,
    weak: weakRows
      .filter((e) => slugs.has(e.topic_id as string))
      .map((e) => ({
        topicId: e.topic_id as string,
        slug: slugs.get(e.topic_id as string)!,
        title: titles.get(`${e.topic_id}:title`) ?? "",
        attempts: Number(e.attempts),
        wrong: Number(e.wrong),
      })),
  };
}

// Whole minutes for display; any learning at all shows as at least 1 minute.
export const toMinutes = (seconds: number) => (seconds <= 0 ? 0 : Math.max(1, Math.round(seconds / 60)));

export function weekdayLabel(day: string, lang: Locale) {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-MA" : "fr-FR", { weekday: "short", timeZone: "UTC" }).format(
    new Date(`${day}T12:00:00Z`),
  );
}
