import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChildAvatar } from "@/components/child-avatar";
import { Stars } from "@/components/stars";
import { WeekChart } from "@/components/week-chart";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { getChildDashboard, toMinutes } from "@/lib/dashboard";
import { getChildren } from "@/lib/data";

// Parent dashboard (KONZEPT.md §10): progress, today, the week, weak spots - per child.
export default async function DashboardPage({ params, searchParams }: PageProps<"/[lang]/dashboard">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">{dict.dashboard.title}</h1>
      <Suspense fallback={<p className="text-muted">{dict.common.loading}</p>}>
        <Dashboard lang={lang} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Dashboard({ lang, searchParams }: { lang: Locale; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [dict, , query] = await Promise.all([getDictionary(lang), requireUser(lang), searchParams]);
  const t = dict.dashboard;
  const children = await getChildren();
  if (children.length === 0) return <p className="text-muted">{t.noChildren}</p>;

  const wanted = typeof query.child === "string" ? query.child : undefined;
  const child = children.find((c) => c.id === wanted) ?? children[0];
  const data = await getChildDashboard(child.id, lang);
  const min = (n: number) => t.min.replace("{n}", String(n));
  const card = "flex flex-col gap-1 rounded-2xl border border-line bg-card p-4";
  const big = "text-3xl font-extrabold";
  const todayActive = data.today.learningSeconds > 0 || data.today.attempts > 0 || data.today.videosWatched > 0 || data.today.topicsCompleted > 0;

  return (
    <>
      <nav aria-label={dict.nav.profiles} className="flex flex-wrap gap-2">
        {children.map((c) => (
          <Link
            key={c.id}
            href={`/${lang}/dashboard?child=${c.id}`}
            aria-current={c.id === child.id ? "page" : undefined}
            className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pe-4 ps-1 font-semibold aria-[current=page]:border-brand aria-[current=page]:bg-brand-soft"
          >
            <ChildAvatar name={c.name} avatarPath={c.avatarPath} photoSrc={c.photoSrc} size={32} />
            {c.name}
          </Link>
        ))}
      </nav>

      <section aria-label={child.name} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={card}>
          <span className="text-sm text-muted">{t.stars}</span>
          <span className="flex items-center gap-2">
            <Stars count={1} max={1} size={28} label="" />
            <span className={big}>{data.stars}</span>
          </span>
        </div>
        <div className={card}>
          <span className="text-sm text-muted">{t.topicsDone}</span>
          <span className={big}>{data.topicsCompleted}</span>
        </div>
        <div className={card}>
          <span className="text-sm text-muted">{t.correctRate}</span>
          <span className={big}>{data.correctRate === null ? "—" : `${Math.round(data.correctRate)}%`}</span>
          {data.correctRate === null && <span className="text-xs text-muted">{t.noAttempts}</span>}
        </div>
      </section>

      <section aria-labelledby="today" className="flex flex-col gap-3">
        <h2 id="today" className="text-xl font-extrabold">
          {t.today}
        </h2>
        {todayActive ? (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [t.learningTime, min(toMinutes(data.today.learningSeconds))],
              [t.topicsDone, String(data.today.topicsCompleted)],
              [t.videos, String(data.today.videosWatched)],
              [t.exercises, `${data.today.correct}/${data.today.attempts}`],
            ].map(([label, value]) => (
              <div key={label} className={card}>
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="text-2xl font-extrabold">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-muted">{t.todayEmpty.replace("{name}", child.name)}</p>
        )}
      </section>

      <section aria-labelledby="week" className="flex flex-col gap-3">
        <h2 id="week" className="text-xl font-extrabold">
          {t.week}
        </h2>
        <WeekChart
          days={data.week}
          lang={lang}
          labels={{ title: t.weekChart, table: t.weekTable, day: t.day, minutes: t.minutes, topics: t.topics, min: t.min }}
        />
      </section>

      <section aria-labelledby="weak" className="flex flex-col gap-3">
        <h2 id="weak" className="text-xl font-extrabold">
          {t.weak}
        </h2>
        {data.weak.length === 0 ? (
          <p className="text-muted">{t.weakEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.weak.map((w) => (
              <li key={w.topicId} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card p-3">
                <span className="flex flex-col text-start">
                  <span className="font-semibold">{w.title}</span>
                  <span className="text-sm text-muted">{t.weakLine.replace("{wrong}", String(w.wrong)).replace("{attempts}", String(w.attempts))}</span>
                </span>
                <Link href={`/${lang}/learn/topic/${w.slug}`} className="shrink-0 font-semibold text-brand underline">
                  {t.practice}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
