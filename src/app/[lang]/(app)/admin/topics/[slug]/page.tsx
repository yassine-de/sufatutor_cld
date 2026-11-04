import Link from "next/link";
import { notFound } from "next/navigation";
import { lang as getLang } from "next/root-params";
import { Suspense } from "react";
import { ConfirmDelete } from "@/components/confirm-delete";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getTopicEditorData, requireAdmin } from "@/lib/admin";
import { deleteTopic, setExerciseStatus } from "../../actions";
import { TitlesForm, VideoForm, WorksheetForm } from "./forms";

export default async function AdminTopicPage({ params }: PageProps<"/[lang]/admin/topics/[slug]">) {
  const lang = await getLang(); // the slug is request-time data and is read inside the boundary
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

async function Editor({ lang, params }: { lang: Locale; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dict = await getDictionary(lang);
  await requireAdmin(lang);
  const topic = await getTopicEditorData(slug);
  if (!topic) notFound();
  const t = dict.admin;
  const card = "flex flex-col gap-4 rounded-2xl border border-line bg-card p-4";
  const h2 = "text-xl font-extrabold";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href={`/${lang}/admin?grade=${topic.gradeNumber}`} className="w-fit text-sm font-semibold text-brand underline">
          <span aria-hidden="true" className="inline-block rtl:rotate-180">←</span> {t.back}
        </Link>
        <h1 className="text-3xl font-extrabold">{topic.titles[lang]}</h1>
      </header>

      <section className={card} aria-labelledby="titles">
        <h2 id="titles" className={h2}>{t.titles}</h2>
        <TitlesForm lang={lang} topicId={topic.id} titles={topic.titles} t={t} />
      </section>

      {(["ar", "fr"] as const).map((l) => {
        const c = topic.content[l];
        return (
          <section key={l} className={card} aria-labelledby={`lang-${l}`}>
            <h2 id={`lang-${l}`} className={h2}>{t.contentFor.replace("{lang}", dict.languages[l])}</h2>

            <div className="flex flex-col gap-2">
              <h3 className="font-bold">{t.video}</h3>
              <VideoForm lang={lang} topicId={topic.id} sprache={l} video={c.video} t={t} />
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-bold">{t.worksheet}</h3>
              <WorksheetForm lang={lang} topicId={topic.id} sprache={l} worksheet={c.worksheet} t={t} />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-bold">{t.exerciseSet}</h3>
                {c.exerciseSet && (
                  <form action={setExerciseStatus.bind(null, lang, topic.id, l)} className="flex items-center gap-2">
                    <select name="status" defaultValue={c.exerciseSet.status} className="rounded-xl border border-line bg-card px-3 py-1.5 text-sm">
                      <option value="entwurf">{t.draft}</option>
                      <option value="veroeffentlicht">{t.published}</option>
                    </select>
                    <button type="submit" className="rounded-full border border-brand px-4 py-1.5 text-sm font-bold text-brand hover:bg-brand-soft">{t.save}</button>
                  </form>
                )}
              </div>
              {!c.exerciseSet || c.exerciseSet.exercises.length === 0 ? (
                <p className="text-sm text-muted">{t.noExercises}</p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {c.exerciseSet.exercises.map((e, i) => (
                    <li key={e.id}>
                      <Link
                        href={`/${lang}/admin/topics/${topic.slug}/exercise/${l}/${e.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 hover:border-brand"
                      >
                        <span className="text-start">
                          <span className="font-semibold">{i + 1}. {e.frage}</span>
                          <span className="block text-xs text-muted">{t[e.fragetyp as "multiple_choice" | "zahl_eingeben" | "zuordnen"]} · {e.punkte} {t.points}</span>
                        </span>
                        <span className="text-sm font-semibold text-brand">{t.edit}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
              <Link href={`/${lang}/admin/topics/${topic.slug}/exercise/${l}/new`} className="w-fit rounded-full bg-brand px-5 py-2 font-bold text-white">
                + {t.addExercise}
              </Link>
            </div>
          </section>
        );
      })}

      <ConfirmDelete
        action={deleteTopic.bind(null, lang, topic.id)}
        labels={{ delete: t.deleteTopic, warning: t.deleteWarning, confirm: t.confirmDelete, cancel: t.cancel }}
      />
    </div>
  );
}
