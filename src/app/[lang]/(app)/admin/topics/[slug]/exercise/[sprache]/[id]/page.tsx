import Link from "next/link";
import { notFound } from "next/navigation";
import { lang as getLang } from "next/root-params";
import { Suspense } from "react";
import { ConfirmDelete } from "@/components/confirm-delete";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { deleteExercise } from "../../../../../actions";
import { ExerciseForm, type ExerciseInitial } from "./exercise-form";

export default async function ExercisePage({ params }: PageProps<"/[lang]/admin/topics/[slug]/exercise/[sprache]/[id]">) {
  const lang = await getLang();
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main>
      <Suspense fallback={<p className="text-muted">{dict.common.loading}</p>}>
        <Editor lang={lang} params={params} />
      </Suspense>
    </main>
  );
}

type Row = Record<string, unknown>;
const strings = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);

const BLANK: ExerciseInitial = {
  fragetyp: "multiple_choice", frage: "", punkte: 1, options: ["", ""], correct: 0, wert: "", einheit: "",
  pairs: [{ left: "", right: "" }, { left: "", right: "" }],
};

async function Editor({ lang, params }: { lang: Locale; params: Promise<{ slug: string; sprache: string; id: string }> }) {
  const { slug, sprache, id } = await params;
  const dict = await getDictionary(lang);
  await requireAdmin(lang);
  if (sprache !== "ar" && sprache !== "fr") notFound();

  const supabase = await createClient();
  const { data: topic } = await supabase.from("topics").select("id, slug").eq("slug", slug).maybeSingle();
  if (!topic) notFound();

  let initial = BLANK;
  if (id !== "new") {
    // The solution is only readable through this admin-only function.
    const { data, error } = await supabase.rpc("admin_exercise", { p_id: id });
    const e = data as Row | null;
    if (error || !e?.id) notFound();
    const daten = (e.daten ?? {}) as Row;
    const loesung = (e.loesung ?? {}) as Row;
    const links = strings(daten.links);
    const rights = strings(daten.rechts);
    const pairIndexes = (Array.isArray(loesung.paare) ? loesung.paare : []) as number[][];
    initial = {
      fragetyp: e.fragetyp as ExerciseInitial["fragetyp"],
      frage: String(daten.frage ?? ""),
      punkte: Number(e.punkte ?? 1),
      options: strings(daten.optionen).length >= 2 ? strings(daten.optionen) : BLANK.options,
      correct: Number(loesung.index ?? 0),
      wert: loesung.wert === undefined ? "" : String(loesung.wert),
      einheit: String(daten.einheit ?? ""),
      pairs: links.length >= 2
        ? links.map((left, i) => ({ left, right: rights[pairIndexes.find((p) => p[0] === i)?.[1] ?? i] ?? "" }))
        : BLANK.pairs,
    };
  }
  const t = dict.admin;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link href={`/${lang}/admin/topics/${topic.slug}`} className="w-fit text-sm font-semibold text-brand underline">
          <span aria-hidden="true" className="inline-block rtl:rotate-180">←</span> {t.back}
        </Link>
        <h1 className="text-3xl font-extrabold">
          {id === "new" ? t.addExercise : t.edit} · {dict.languages[sprache]}
        </h1>
      </header>
      <ExerciseForm lang={lang} topicId={topic.id} sprache={sprache} exerciseId={id === "new" ? null : id} initial={initial} t={t} />
      {id !== "new" && (
        <ConfirmDelete
          action={deleteExercise.bind(null, lang, topic.id, id)}
          labels={{ delete: t.delete, warning: t.deleteExerciseWarning, confirm: t.confirmDelete, cancel: t.cancel }}
        />
      )}
    </div>
  );
}
