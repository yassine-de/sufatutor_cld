"use server";

import { redirect } from "next/navigation";
import { defaultLocale, hasLocale, type Locale } from "@/i18n/config";
import { requireUser } from "@/lib/auth";
import { getActiveChild } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

const safeLang = (lang: string): Locale => (hasLocale(lang) ? lang : defaultLocale);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Server actions are public endpoints: the signed-in parent and the child on this device are
// re-checked here, and the database re-checks ownership again (RLS / SECURITY DEFINER functions).
async function context(lang: string) {
  await requireUser(safeLang(lang));
  const child = await getActiveChild();
  return child ? { child, supabase: await createClient() } : null;
}

export type CheckResult = { ok: true; correct: boolean } | { ok: false };

// Sends one answer. The server compares it with the stored solution and only says right or wrong.
export async function checkAnswer(
  lang: string,
  exerciseId: string,
  antwort: unknown,
  dauerMs?: number,
): Promise<CheckResult> {
  const ctx = await context(lang);
  if (!ctx || !UUID.test(exerciseId) || typeof antwort !== "object" || antwort === null) return { ok: false };
  if (JSON.stringify(antwort).length > 2000) return { ok: false };

  const { data, error } = await ctx.supabase.rpc("submit_attempt", {
    p_child: ctx.child.id,
    p_exercise: exerciseId,
    p_antwort: antwort,
    p_dauer_ms: Number.isFinite(dauerMs) ? Math.max(0, Math.round(dauerMs!)) : null,
  });
  return error || typeof data !== "boolean" ? { ok: false } : { ok: true, correct: data };
}

export type FinishResult =
  | { ok: true; total: number; correct: number; stars: number; bestStars: number; completed: boolean }
  | { ok: false };

// Turns the answers of this run into stars for the topic (the rules live in the database).
export async function finishPractice(lang: string, topicId: string): Promise<FinishResult> {
  const ctx = await context(lang);
  if (!ctx || !UUID.test(topicId)) return { ok: false };

  const { data, error } = await ctx.supabase.rpc("finish_topic_practice", { p_child: ctx.child.id, p_topic: topicId });
  if (error || !data) return { ok: false };
  const r = data as { total: number; correct: number; stars: number; best_stars: number; completed: boolean };
  return { ok: true, total: r.total, correct: r.correct, stars: r.stars, bestStars: r.best_stars, completed: r.completed };
}

// "I watched the video, let's practise": marks the video as done and moves on to the exercises.
export async function videoWatched(lang: string, topicSlug: string, videoItemId: string) {
  const locale = safeLang(lang);
  const ctx = await context(locale);
  if (!ctx) redirect(`/${locale}/profiles`);

  if (UUID.test(videoItemId)) {
    await ctx.supabase.from("progress").upsert(
      { child_id: ctx.child.id, content_item_id: videoItemId, status: "abgeschlossen", zuletzt_am: new Date().toISOString() },
      { onConflict: "child_id,content_item_id" },
    );
  }
  redirect(`/${locale}/learn/topic/${encodeURIComponent(topicSlug)}/practice`);
}

// Heartbeat for the learning-time statistics of the parent dashboard.
export async function trackLearning(): Promise<void> {
  const child = await getActiveChild();
  if (!child) return;
  const supabase = await createClient();
  await supabase.rpc("track_learning", { p_child: child.id });
}
