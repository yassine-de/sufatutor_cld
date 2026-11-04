import { cache } from "react";
import { cookies } from "next/headers";
import type { Locale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import type { Avatar, ChildProfile, ChildView, GradeOption } from "@/lib/types";

export const ACTIVE_CHILD_COOKIE = "ta3lim_child";
const PHOTO_BUCKET = "child-photos";
const SIGNED_URL_SECONDS = 60 * 60;

async function translations(entityType: string, ids: string[], lang: Locale) {
  if (ids.length === 0) return new Map<string, string>();
  const supabase = await createClient();
  const { data } = await supabase
    .from("translations")
    .select("entity_id, text")
    .eq("entity_type", entityType)
    .eq("feld", "name")
    .eq("sprache", lang)
    .in("entity_id", ids);
  return new Map((data ?? []).map((row) => [row.entity_id as string, row.text as string]));
}

export const getAvatars = cache(async (lang: Locale): Promise<Avatar[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("avatars")
    .select("id, slug, bild_pfad")
    .eq("aktiv", true)
    .order("reihenfolge");
  const rows = data ?? [];
  const names = await translations("avatar", rows.map((r) => r.id), lang);
  return rows.map((r) => ({ ...r, name: names.get(r.id) ?? r.slug }));
});

export const getGrades = cache(async (lang: Locale): Promise<GradeOption[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("grades")
    .select("id, nummer")
    .eq("stufe", "primaire")
    .order("nummer");
  const rows = data ?? [];
  const names = await translations("grade", rows.map((r) => r.id), lang);
  return rows.map((r) => ({ ...r, name: names.get(r.id) ?? String(r.nummer) }));
});

// Children of the signed-in parent (RLS limits the query), with images resolved.
export const getChildren = cache(async (): Promise<ChildView[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("child_profiles")
    .select("id, name, avatar_id, photo_url, grade_id, sprache")
    .order("created_at");
  const children = (data ?? []) as ChildProfile[];
  if (children.length === 0) return [];

  const [{ data: avatars }, { data: grades }] = await Promise.all([
    supabase.from("avatars").select("id, bild_pfad"),
    supabase.from("grades").select("id, nummer"),
  ]);
  const avatarPath = new Map((avatars ?? []).map((a) => [a.id as string, a.bild_pfad as string]));
  const gradeNumber = new Map((grades ?? []).map((g) => [g.id as string, g.nummer as number]));

  // Photos are private: hand out short-lived signed URLs, never public ones.
  const photoPaths = children.flatMap((c) => (c.photo_url ? [c.photo_url] : []));
  const signed = new Map<string, string>();
  if (photoPaths.length > 0) {
    const { data: urls } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(photoPaths, SIGNED_URL_SECONDS);
    (urls ?? []).forEach((u) => u.path && u.signedUrl && signed.set(u.path, u.signedUrl));
  }

  return children.map((c) => ({
    ...c,
    avatarPath: c.avatar_id ? (avatarPath.get(c.avatar_id) ?? null) : null,
    photoSrc: c.photo_url ? (signed.get(c.photo_url) ?? null) : null,
    gradeNumber: c.grade_id ? (gradeNumber.get(c.grade_id) ?? null) : null,
  }));
});

export async function getChild(id: string): Promise<ChildView | null> {
  return (await getChildren()).find((c) => c.id === id) ?? null;
}

export async function getChildLimit(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_child_limit");
  return typeof data === "number" ? data : 3;
}

export async function getParentProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("users").select("telefon, anzeigename, sprache").eq("id", userId).single();
  return data as { telefon: string | null; anzeigename: string | null; sprache: Locale } | null;
}

// The child currently using the device. The cookie is only a pointer: ownership is re-checked
// through RLS on every read, so a forged id simply finds nothing.
export async function getActiveChild(): Promise<ChildView | null> {
  const id = (await cookies()).get(ACTIVE_CHILD_COOKIE)?.value;
  return id ? getChild(id) : null;
}
