import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { lang as getLang } from "next/root-params";
import { Suspense } from "react";
import { Stars } from "@/components/stars";
import { VideoPlayer } from "@/components/video-player";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { getActiveChild } from "@/lib/data";
import { getTopicPage } from "@/lib/learning";
import { videoWatched } from "../../actions";

// One topic: video -> exercises -> worksheet, the flow from KONZEPT.md §2 / §12.
export default async function TopicPage({ params }: PageProps<"/[lang]/learn/topic/[slug]">) {
  const lang = await getLang();
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main>
      <Suspense fallback={<p className="text-muted">{dict.common.loading}</p>}>
        <Topic lang={lang} params={params} />
      </Suspense>
    </main>
  );
}

async function Topic({ lang, params }: { lang: Locale; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dict = await getDictionary(lang);
  await requireUser(lang);
  const child = await getActiveChild();
  if (!child) redirect(`/${lang}/profiles`);

  const topic = await getTopicPage(slug, lang, child.sprache, child.id);
  if (!topic) notFound();
  const t = dict.learn.topic;
  const sectionTitle = "text-xl font-extrabold";
  const hasContent = topic.video || topic.exercises || topic.worksheet;

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href={`/${lang}/learn/math/${topic.gradeNumber}`} className="w-fit text-sm font-semibold text-brand underline">
          <span aria-hidden="true" className="inline-block rtl:rotate-180">←</span> {t.backToChapters}
        </Link>
        <p className="text-sm text-muted">
          {topic.chapterLabel} · {topic.chapterTitle}
        </p>
        <h1 className="text-3xl font-extrabold leading-tight">{topic.title}</h1>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span>{t.yourStars}</span>
          <Stars count={topic.sterne} size={24} label={dict.learn.starsOf.replace("{n}", String(topic.sterne))} />
        </div>
      </header>

      {!hasContent && <p className="rounded-2xl border border-line bg-card p-4 text-muted">{t.contentLanguage}</p>}

      <section aria-labelledby="video" className="flex flex-col gap-3">
        <h2 id="video" className={sectionTitle}>
          1 · {t.video}
        </h2>
        {topic.video ? (
          <>
            <VideoPlayer url={topic.video.url} title={topic.title} />
            {topic.exercises && (
              <form action={videoWatched.bind(null, lang, topic.slug, topic.video.id)}>
                <button type="submit" className="rounded-full bg-brand px-6 py-3 font-bold text-white">
                  {t.watchedContinue}
                </button>
              </form>
            )}
          </>
        ) : (
          <p className="text-muted">{t.videoSoon}</p>
        )}
      </section>

      <section aria-labelledby="exercises" className="flex flex-col gap-3">
        <h2 id="exercises" className={sectionTitle}>
          2 · {t.exercises}
        </h2>
        {topic.exercises ? (
          <div className="flex flex-wrap items-center gap-4">
            <Link href={`/${lang}/learn/topic/${topic.slug}/practice`} className="rounded-full bg-brand px-6 py-3 font-bold text-white">
              {t.startExercises}
            </Link>
            <span className="text-sm text-muted">{t.exercisesCount.replace("{n}", String(topic.exercises.count))}</span>
          </div>
        ) : (
          <p className="text-muted">{t.exercisesSoon}</p>
        )}
      </section>

      {topic.worksheet && (
        <section aria-labelledby="worksheet" className="flex flex-col gap-3">
          <h2 id="worksheet" className={sectionTitle}>
            3 · {t.worksheet}
          </h2>
          <a
            href={topic.worksheet.signedUrl}
            target="_blank"
            rel="noopener"
            className="w-fit rounded-full border border-brand px-5 py-2 font-bold text-brand hover:bg-brand-soft"
          >
            {t.downloadWorksheet}
          </a>
        </section>
      )}

      {topic.siblings.next && (
        <Link
          href={`/${lang}/learn/topic/${topic.siblings.next.slug}`}
          className="flex flex-col rounded-2xl border border-line bg-card p-4 hover:border-brand"
        >
          <span className="text-sm text-muted">{t.nextTopic}</span>
          <span className="font-bold">{topic.siblings.next.title}</span>
        </Link>
      )}
    </article>
  );
}
