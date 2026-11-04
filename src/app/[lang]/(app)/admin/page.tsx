import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { getContentSummary, requireAdmin, type ContentSummary } from "@/lib/admin";
import { getMathChapters } from "@/lib/learning";
import { createTopic } from "./actions";

const GRADES = [1, 2, 3];

export default async function AdminPage({ params, searchParams }: PageProps<"/[lang]/admin">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">{dict.admin.title}</h1>
        <Link href={`/${lang}/admin/translations`} className="font-semibold text-brand underline">
          {dict.admin.translations}
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted">{dict.common.loading}</p>}>
        <Overview lang={lang} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function Badge({ status, label, dict }: { status: "entwurf" | "veroeffentlicht" | null; label: string; dict: Dictionary["admin"] }) {
  const tone =
    status === "veroeffentlicht"
      ? "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200"
      : status === "entwurf"
        ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        : "bg-brand-soft text-muted";
  const state = status === "veroeffentlicht" ? dict.published : status === "entwurf" ? dict.draft : dict.none;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tone}`} title={`${label}: ${state}`}>
      {label}
      {status === null ? "" : status === "veroeffentlicht" ? " ✓" : " …"}
    </span>
  );
}

function Summary({ s, dict }: { s: ContentSummary; dict: Dictionary["admin"] }) {
  return (
    <span className="flex flex-wrap gap-1">
      <Badge status={s.video} label="V" dict={dict} />
      <Badge status={s.exercises?.status ?? null} label={`E${s.exercises ? ` ${s.exercises.count}` : ""}`} dict={dict} />
      <Badge status={s.worksheet} label="W" dict={dict} />
    </span>
  );
}

async function Overview({ lang, searchParams }: { lang: Locale; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [dict, , query] = await Promise.all([getDictionary(lang), requireAdmin(lang), searchParams]);
  const t = dict.admin;
  const gradeNumber = GRADES.includes(Number(query.grade)) ? Number(query.grade) : 1;

  const chapters = (await getMathChapters(gradeNumber, lang, null)) ?? [];
  const summary = await getContentSummary(chapters.flatMap((c) => c.topics.map((x) => x.id)));
  const input = "w-full rounded-xl border border-line bg-card px-3 py-2";

  return (
    <>
      <nav aria-label={t.grade} className="flex flex-wrap items-center gap-2">
        {GRADES.map((g) => (
          <Link
            key={g}
            href={`/${lang}/admin?grade=${g}`}
            aria-current={g === gradeNumber ? "page" : undefined}
            className="rounded-full border border-line bg-card px-4 py-1.5 text-sm font-bold aria-[current=page]:border-brand aria-[current=page]:bg-brand aria-[current=page]:text-white"
          >
            {dict.grades[String(g) as keyof typeof dict.grades]}
          </Link>
        ))}
        <span className="ms-auto text-xs text-muted">
          V {t.video} · E {t.exercises} · W {t.worksheet}
        </span>
      </nav>

      {chapters.map((chapter) => (
        <section key={chapter.id} aria-labelledby={`c-${chapter.id}`} className="flex flex-col gap-2">
          <h2 id={`c-${chapter.id}`} className="text-lg font-extrabold">
            {chapter.label} · {chapter.title}
          </h2>
          <ul className="flex flex-col gap-2">
            {chapter.topics.map((topic) => {
              const s = summary.get(topic.id);
              return (
                <li key={topic.id}>
                  <Link href={`/${lang}/admin/topics/${topic.slug}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card p-3 hover:border-brand">
                    <span className="font-semibold">
                      {topic.reihenfolge}. {topic.title}
                    </span>
                    {s && (
                      <span className="flex gap-4 text-xs">
                        {(["ar", "fr"] as const).map((l) => (
                          <span key={l} className="flex items-center gap-1">
                            <b>{l.toUpperCase()}</b>
                            <Summary s={s[l]} dict={t} />
                          </span>
                        ))}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          <details className="rounded-2xl border border-dashed border-line p-3">
            <summary className="cursor-pointer font-semibold text-brand">+ {t.newTopic}</summary>
            <form action={createTopic.bind(null, lang, chapter.id)} className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-semibold">
                {t.titleAr}
                <input name="title_ar" dir="rtl" required maxLength={200} className={input} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold">
                {t.titleFr}
                <input name="title_fr" dir="ltr" required maxLength={200} className={input} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold">
                {t.week}
                <input name="week" type="number" min={1} max={34} className={input} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold">
                {t.domain}
                <select name="domain" className={input} defaultValue="number">
                  {(["number", "geometry", "measure", "data"] as const).map((d) => (
                    <option key={d} value={d}>
                      {dict.domains[d]}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="w-fit rounded-full bg-brand px-5 py-2 font-bold text-white">
                {t.createTopic}
              </button>
            </form>
          </details>
        </section>
      ))}
    </>
  );
}
