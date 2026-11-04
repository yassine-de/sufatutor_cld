"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasLocale, defaultLocale, type Locale } from "@/i18n/config";
import { ACTIVE_CHILD_COOKIE, getChild } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: "name" | "limit" | "photo" | "generic"; saved?: boolean } | undefined;

const PHOTO_BUCKET = "child-photos";
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

// The language comes from the URL the form was rendered on; never trust it blindly.
const safeLang = (lang: string): Locale => (hasLocale(lang) ? lang : defaultLocale);

type ChildInput = {
  name: string;
  grade_id: string | null;
  sprache: Locale;
  avatar_id: string | null;
  photo_url: string | null;
};

function readChildForm(formData: FormData, userId: string): ChildInput | "name" | "photo" | "generic" {
  const text = (key: string) => String(formData.get(key) ?? "").trim();

  const name = text("name");
  if (name.length < 1 || name.length > 40) return "name";

  const sprache = text("sprache");
  if (!hasLocale(sprache)) return "generic";

  // Ids are only ever inserted through the API, where the database validates them (FK + RLS).
  const uuid = new RegExp(`^${UUID}$`, "i");
  const grade = text("grade_id");
  const avatar = text("avatar_id");

  // A photo must sit in the parent's own folder of the private bucket and be one of our JPEGs.
  const photo = text("photo_path");
  if (photo && !new RegExp(`^${userId}/${UUID}\\.jpg$`, "i").test(photo)) return "photo";

  return {
    name,
    sprache,
    grade_id: uuid.test(grade) ? grade : null,
    avatar_id: uuid.test(avatar) ? avatar : null,
    photo_url: photo || null,
  };
}

const isLimitError = (error: { message?: string } | null) => Boolean(error?.message?.includes("limit"));

export async function createChild(lang: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const locale = safeLang(lang);
  const user = await requireUser(locale);
  const input = readChildForm(formData, user.id);
  if (typeof input === "string") return { error: input };

  const supabase = await createClient();
  const { error } = await supabase.from("child_profiles").insert({ ...input, parent_user_id: user.id });
  if (error) return { error: isLimitError(error) ? "limit" : "generic" };

  redirect(`/${locale}/profiles/manage`);
}

export async function updateChild(lang: string, id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const locale = safeLang(lang);
  const user = await requireUser(locale);
  const input = readChildForm(formData, user.id);
  if (typeof input === "string") return { error: input };

  const existing = await getChild(id);
  if (!existing) return { error: "generic" };

  const supabase = await createClient();
  const { error } = await supabase.from("child_profiles").update(input).eq("id", id);
  if (error) return { error: "generic" };

  // Replaced or removed photo: delete the old file so no unused pictures of children linger.
  if (existing.photo_url && existing.photo_url !== input.photo_url) {
    await supabase.storage.from(PHOTO_BUCKET).remove([existing.photo_url]);
  }
  redirect(`/${locale}/profiles/manage`);
}

export async function deleteChild(lang: string, id: string) {
  const locale = safeLang(lang);
  await requireUser(locale);
  const existing = await getChild(id);

  const supabase = await createClient();
  await supabase.from("child_profiles").delete().eq("id", id);
  if (existing?.photo_url) await supabase.storage.from(PHOTO_BUCKET).remove([existing.photo_url]);

  const store = await cookies();
  if (store.get(ACTIVE_CHILD_COOKIE)?.value === id) store.delete(ACTIVE_CHILD_COOKIE);
  redirect(`/${locale}/profiles/manage`);
}

// "Who is learning?": remember the child on this device and open the learning area in the
// language the parent chose for that child (KONZEPT.md §9).
export async function selectChild(lang: string, id: string) {
  const locale = safeLang(lang);
  await requireUser(locale);
  const child = await getChild(id);
  if (!child) redirect(`/${locale}/profiles`);

  (await cookies()).set(ACTIVE_CHILD_COOKIE, child.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(`/${child.sprache}/learn`);
}

export async function updateAccount(lang: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const locale = safeLang(lang);
  const user = await requireUser(locale);

  const name = String(formData.get("anzeigename") ?? "").trim();
  const sprache = String(formData.get("sprache") ?? "");
  if (name.length > 60) return { error: "name" };
  if (!hasLocale(sprache)) return { error: "generic" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ anzeigename: name || null, sprache })
    .eq("id", user.id);
  if (error) return { error: "generic" };

  if (sprache !== locale) redirect(`/${sprache}/account`);
  return { saved: true };
}

export async function signOut(lang: string) {
  const locale = safeLang(lang);
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(ACTIVE_CHILD_COOKIE);
  redirect(`/${locale}`);
}
