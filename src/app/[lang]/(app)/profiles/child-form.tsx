"use client";

import { useActionState, useRef, useState } from "react";
import { ChildAvatar } from "@/components/child-avatar";
import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { prepareProfilePhoto } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";
import type { Avatar, ChildView, GradeOption } from "@/lib/types";
import type { FormState } from "../actions";

type Props = {
  lang: Locale;
  parentId: string;
  dict: Dictionary;
  avatars: Avatar[];
  grades: GradeOption[];
  child?: ChildView;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
};

const PHOTO_BUCKET = "child-photos";

export function ChildForm({ lang, parentId, dict, avatars, grades, child, action }: Props) {
  const t = dict.profiles;
  const [state, formAction, pending] = useActionState(action, undefined);

  const [name, setName] = useState(child?.name ?? "");
  const [avatarId, setAvatarId] = useState(child?.avatar_id ?? (child?.photo_url ? "" : (avatars[0]?.id ?? "")));
  const [photoPath, setPhotoPath] = useState(child?.photo_url ?? "");
  const [photoPreview, setPhotoPreview] = useState(child?.photoSrc ?? "");
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  // Files uploaded in this session but not (yet) saved; removed again if the parent changes their mind.
  const unsaved = useRef<string[]>([]);

  const selectedAvatar = avatars.find((a) => a.id === avatarId);

  async function discardUnsaved(except?: string) {
    const stale = unsaved.current.filter((p) => p !== except);
    unsaved.current = unsaved.current.filter((p) => p === except);
    if (stale.length > 0) await createClient().storage.from(PHOTO_BUCKET).remove(stale);
  }

  async function onPhotoChosen(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setPhotoError(false);
    try {
      const blob = await prepareProfilePhoto(file);
      const path = `${parentId}/${crypto.randomUUID()}.jpg`;
      const { error } = await createClient().storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      await discardUnsaved();
      unsaved.current.push(path);
      setPhotoPath(path);
      setPhotoPreview(URL.createObjectURL(blob));
      setAvatarId("");
    } catch {
      setPhotoError(true);
    } finally {
      setUploading(false);
    }
  }

  async function clearPhoto() {
    await discardUnsaved();
    setPhotoPath("");
    setPhotoPreview("");
  }

  const fieldClass =
    "w-full rounded-xl border border-line bg-card px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";
  const errorMessage = state?.error ? dict.errors[state.error] : photoError ? dict.errors.photo : null;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex justify-center">
        <ChildAvatar
          name={name || "?"}
          avatarPath={photoPath ? null : (selectedAvatar?.bild_pfad ?? null)}
          photoSrc={photoPath ? photoPreview : null}
          size={112}
        />
      </div>

      <label className="flex flex-col gap-2 font-semibold">
        {t.name}
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoComplete="off"
          className={fieldClass}
          required
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 font-semibold">
          {t.grade}
          <select name="grade_id" defaultValue={child?.grade_id ?? ""} className={fieldClass}>
            <option value="">{t.noGrade}</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 font-semibold">
          {t.language}
          <select name="sprache" defaultValue={child?.sprache ?? lang} className={fieldClass}>
            {locales.map((l) => (
              <option key={l} value={l}>
                {dict.languages[l]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-semibold">{t.avatar}</legend>
        <div role="radiogroup" className="grid grid-cols-4 gap-3">
          {avatars.map((a) => (
            <label key={a.id} className="cursor-pointer">
              <input
                type="radio"
                name="avatar_pick"
                value={a.id}
                checked={avatarId === a.id}
                onChange={() => {
                  setAvatarId(a.id);
                  void clearPhoto();
                }}
                className="peer sr-only"
              />
              <span className="flex flex-col items-center gap-1 rounded-2xl border-2 border-transparent p-1 peer-checked:border-brand peer-focus-visible:outline-2 peer-focus-visible:outline-brand">
                <ChildAvatar name={a.name} avatarPath={a.bild_pfad} size={64} alt={a.name} />
                <span className="text-xs text-muted">{a.name}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">{t.photo}</legend>
        <p className="text-sm text-muted">{t.photoHint}</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-full border border-brand px-4 py-2 text-sm font-bold text-brand hover:bg-brand-soft">
            {uploading ? dict.common.loading : t.choosePhoto}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                void onPhotoChosen(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {photoPath && (
            <button
              type="button"
              onClick={() => {
                void clearPhoto();
                if (!avatarId) setAvatarId(avatars[0]?.id ?? "");
              }}
              className="text-sm font-semibold text-brand underline">
              {t.removePhoto}
            </button>
          )}
        </div>
      </fieldset>

      <input type="hidden" name="avatar_id" value={avatarId} />
      <input type="hidden" name="photo_path" value={photoPath} />

      {errorMessage && (
        <p role="alert" className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-800 dark:bg-red-950 dark:text-red-200">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || uploading}
        className="rounded-full bg-brand px-6 py-3 font-bold text-white disabled:opacity-60"
      >
        {pending ? t.saving : t.save}
      </button>
    </form>
  );
}
