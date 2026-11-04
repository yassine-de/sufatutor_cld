import { notFound, redirect } from "next/navigation";
import { lang as getLang } from "next/root-params";
import { Suspense } from "react";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { getActiveChild } from "@/lib/data";
import { getExercises, getTopicPage } from "@/lib/learning";
import { PracticeRunner } from "./practice-runner";

export default async function PracticePage({ params }: PageProps<"/[lang]/learn/topic/[slug]/practice">) {
  const lang = await getLang();
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main>
      <Suspense fallback={<p className="text-muted">{dict.common.loading}</p>}>
        <Practice lang={lang} params={params} />
      </Suspense>
    </main>
  );
}

async function Practice({ lang, params }: { lang: Locale; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dict = await getDictionary(lang);
  await requireUser(lang);
  const child = await getActiveChild();
  if (!child) redirect(`/${lang}/profiles`);

  const topic = await getTopicPage(slug, lang, child.sprache, child.id);
  if (!topic) notFound();
  const exercises = await getExercises(topic.id, child.sprache);
  if (exercises.length === 0) redirect(`/${lang}/learn/topic/${slug}`);

  return (
    <PracticeRunner
      lang={lang}
      topicId={topic.id}
      topicTitle={topic.title}
      topicHref={`/${lang}/learn/topic/${topic.slug}`}
      chaptersHref={`/${lang}/learn/math/${topic.gradeNumber}`}
      nextTopic={topic.siblings.next ? { href: `/${lang}/learn/topic/${topic.siblings.next.slug}`, title: topic.siblings.next.title } : null}
      exercises={exercises}
      dict={dict.learn}
      starsOfTemplate={dict.learn.starsOf}
    />
  );
}
