import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { lang as getLang } from "next/root-params";
import { Suspense } from "react";
import { Stars } from "@/components/stars";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { getActiveChild } from "@/lib/data";
import { getMathChapters } from "@/lib/learning";

const GRADES_WITH_CONTENT = [1, 2, 3];

// Subject -> grade -> chapter -> topic, like the sofatutor structure (KONZEPT.md §12).
export default async function MathGradePage({ params }: PageProps<"/[lang]/learn/math/[grade]">) {
  // `params` also holds the grade, which is request-time data: it is read inside the boundary.
  const lang = await getLang();
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">{dict.subjects.math}</h1>
      <Suspense fallback={<p className="text-muted">{dict.common.loading}</p>}>
        <Chapters lang={lang} params={params} />
      </Suspense>
    </main>
  );
}

async function Chapters({ lang, params }: { lang: Locale; params: Promise<{ grade: string }> }) {
  const { grade: gradeParam } = await params;
  const gradeNumber = Number(gradeParam);
  if (!GRADES_WITH_CONTENT.includes(gradeNumber)) notFound();

  const dict = await getDictionary(lang);
  await requireUser(lang);
  const child = await getActiveChild();
  if (!child) redirect(`/${lang}/profiles`);

  const chapters = await getMathChapters(gradeNumber, lang, child.id);
  if (!chapters) notFound();

  const starsLabel = (n: number) => dict.learn.starsOf.replace("{n}", String(n));
  const totalStars = chapters.flatMap((c) => c.topics).reduce((sum, t) => sum + t.sterne, 0);
  const maxStars = chapters.flatMap((c) => c.topics).length * 3;

  return (
    <>
      <nav aria-label={dict.learn.gradeLabel} className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-muted">{dict.learn.gradeLabel}</span>
        {GRADES_WITH_CONTENT.map((g) => (
          <Link
            key={g}
            href={`/${lang}/learn/math/${g}`}
            aria-current={g === gradeNumber ? "page" : undefined}
            className="rounded-full border border-line bg-card px-4 py-1.5 text-sm font-bold aria-[current=page]:border-brand aria-[current=page]:bg-brand aria-[current=page]:text-white"
          >
            {dict.grades[String(g) as keyof typeof dict.grades]}
          </Link>
        ))}
        <span className="ms-auto flex items-center gap-2 text-sm font-semibold">
          <Stars count={1} max={1} size={18} label="" />
          {totalStars} / {maxStars}
        </span>
      </nav>

      {chapters.length === 0 && <p className="text-muted">{dict.learn.noTopics}</p>}

      {chapters.map((chapter) => (
        <section key={chapter.id} aria-labelledby={`ch-${chapter.id}`} className="flex flex-col gap-3">
          <div className="flex flex-col">
            {chapter.semester && (
              <span className="text-xs font-semibold text-muted">{dict.learn.semester.replace("{n}", String(chapter.semester))}</span>
            )}
            <h2 id={`ch-${chapter.id}`} className="text-xl font-extrabold">
              {chapter.label} · {chapter.title}
            </h2>
          </div>
          <ol className="flex flex-col gap-2">
            {chapter.topics.map((topic) => (
              <li key={topic.id}>
                <Link
                  href={`/${lang}/learn/topic/${topic.slug}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card p-3 hover:border-brand"
                >
                  <span className="flex items-center gap-3 text-start">
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-extrabold text-brand"
                    >
                      {topic.done ? "✓" : topic.reihenfolge}
                    </span>
                    <span className="font-semibold">{topic.title}</span>
                  </span>
                  <Stars count={topic.sterne} label={starsLabel(topic.sterne)} />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </>
  );
}
