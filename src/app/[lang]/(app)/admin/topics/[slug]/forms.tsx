"use client";

import { useActionState, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { createClient } from "@/lib/supabase/client";
import { saveTitles, saveVideo, saveWorksheet, type AdminState } from "../../actions";

type T = Dictionary["admin"];
const input = "w-full rounded-xl border border-line bg-card px-3 py-2";
const primary = "w-fit rounded-full bg-brand px-5 py-2 font-bold text-white disabled:opacity-60";

function Feedback({ state, t }: { state: AdminState; t: T }) {
  if (state?.error) return <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-300">{t.error}</p>;
  if (state?.saved) return <p role="status" className="text-sm font-semibold text-green-700 dark:text-green-300">{t.saved}</p>;
  return null;
}

function StatusSelect({ name, value, t }: { name: string; value: string; t: T }) {
  return (
    <select name={name} defaultValue={value} className={input}>
      <option value="entwurf">{t.draft}</option>
      <option value="veroeffentlicht">{t.published}</option>
    </select>
  );
}

export function TitlesForm({ lang, topicId, titles, t }: { lang: string; topicId: string; titles: { ar: string; fr: string }; t: T }) {
  const [state, action, pending] = useActionState(saveTitles.bind(null, lang, topicId), undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm font-semibold">
        {t.titleAr}
        <input name="title_ar" dir="rtl" defaultValue={titles.ar} required maxLength={200} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        {t.titleFr}
        <input name="title_fr" dir="ltr" defaultValue={titles.fr} required maxLength={200} className={input} />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className={primary}>{t.save}</button>
        <Feedback state={state} t={t} />
      </div>
    </form>
  );
}

export function VideoForm({ lang, topicId, sprache, video, t }: {
  lang: string; topicId: string; sprache: "ar" | "fr"; video: { url: string; dauer: number | null; status: string } | null; t: T;
}) {
  const [state, action, pending] = useActionState(saveVideo.bind(null, lang, topicId, sprache), undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <label className="flex flex-col gap-1 text-sm font-semibold sm:col-span-3">
        {t.videoUrl}
        <input name="url" type="url" dir="ltr" defaultValue={video?.url ?? ""} placeholder="https://iframe.mediadelivery.net/embed/…" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        {t.duration}
        <input name="dauer" type="number" min={0} defaultValue={video?.dauer ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        {t.status}
        <StatusSelect name="status" value={video?.status ?? "entwurf"} t={t} />
      </label>
      <div className="flex items-end gap-3">
        <button type="submit" disabled={pending} className={primary}>{t.save}</button>
        <Feedback state={state} t={t} />
      </div>
    </form>
  );
}

// The PDF goes straight from the browser to the private 'worksheets' bucket (admin policy),
// then the server records where it is. File name = <topic id>/<language>.pdf, a re-upload replaces it.
export function WorksheetForm({ lang, topicId, sprache, worksheet, t }: {
  lang: string; topicId: string; sprache: "ar" | "fr"; worksheet: { path: string; status: string } | null; t: T;
}) {
  const [state, setState] = useState<AdminState>();
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(worksheet?.status === "veroeffentlicht");
  const [current, setCurrent] = useState(worksheet?.path ?? "");
  const path = `${topicId}/${sprache}.pdf`;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    const { error } = await createClient().storage.from("worksheets").upload(path, file, { upsert: true, contentType: "application/pdf" });
    setState(error ? { error: true } : await saveWorksheet(lang, topicId, sprache, path, published));
    if (!error) setCurrent(path);
    setBusy(false);
  }
  async function remove() {
    setBusy(true);
    setState(await saveWorksheet(lang, topicId, sprache, null, false));
    setCurrent("");
    setBusy(false);
  }
  async function togglePublished(value: boolean) {
    setPublished(value);
    if (current) setState(await saveWorksheet(lang, topicId, sprache, current, value));
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="cursor-pointer rounded-full border border-brand px-4 py-2 text-sm font-bold text-brand hover:bg-brand-soft">
        {busy ? t.uploading : t.uploadPdf}
        <input type="file" accept="application/pdf" className="sr-only" disabled={busy} onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={published} onChange={(e) => void togglePublished(e.target.checked)} />
        {t.published}
      </label>
      {current && (
        <span className="flex items-center gap-2 text-sm text-muted">
          {t.currentFile}: <code dir="ltr">{current}</code>
          <button type="button" onClick={() => void remove()} className="font-semibold text-red-700 underline dark:text-red-300">{t.removeFile}</button>
        </span>
      )}
      <Feedback state={state} t={t} />
    </div>
  );
}
