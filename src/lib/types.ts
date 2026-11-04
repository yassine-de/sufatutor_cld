// Row shapes used by the family area. Replace with generated types (`supabase gen types`)
// once a project is connected.
import type { Locale } from "@/i18n/config";

export type ChildProfile = {
  id: string;
  name: string;
  avatar_id: string | null;
  photo_url: string | null; // storage path in the private 'child-photos' bucket
  grade_id: string | null;
  sprache: Locale;
};

// A child as the UI needs it: images already resolved (photo is a short-lived signed URL).
export type ChildView = ChildProfile & {
  avatarPath: string | null;
  photoSrc: string | null;
  gradeNumber: number | null;
};

export type Avatar = { id: string; slug: string; bild_pfad: string; name: string };
export type GradeOption = { id: string; nummer: number; name: string };
