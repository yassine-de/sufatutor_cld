import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ChildAvatar } from "@/components/child-avatar";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { getActiveChild } from "@/lib/data";

// Entry of the learning area: who is learning, which subject. Only maths exists so far (MVP).
export default async function LearnPage({ params }: PageProps<"/[lang]/learn">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main>
      <Suspense fallback={<p className="text-muted">{dict.common.loading}</p>}>
        <Subjects lang={lang} />
      </Suspense>
    </main>
  );
}

async function Subjects({ lang }: { lang: Locale }) {
  const dict = await getDictionary(lang);
  await requireUser(lang);
  const child = await getActiveChild();
  if (!child) redirect(`/${lang}/profiles`);

  // Start in the child's own grade when the curriculum has it, else in year 1.
  const grade = child.gradeNumber && child.gradeNumber <= 3 ? child.gradeNumber : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <ChildAvatar name={child.name} avatarPath={child.avatarPath} photoSrc={child.photoSrc} size={72} />
        <div className="flex flex-col">
          <h1 className="text-2xl font-extrabold">{dict.learn.hello.replace("{name}", child.name)}</h1>
          <Link href={`/${lang}/profiles`} className="w-fit text-sm font-semibold text-brand underline">
            {dict.learn.switchChild}
          </Link>
        </div>
      </div>

      <h2 className="text-xl font-bold">{dict.learn.subjectsTitle}</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <li>
          <Link
            href={`/${lang}/learn/math/${grade}`}
            className="flex h-full flex-col gap-2 rounded-2xl border-2 border-brand bg-brand-soft p-5 text-lg font-extrabold hover:brightness-95"
          >
            <span aria-hidden="true" className="text-3xl">
              ➕
            </span>
            {dict.subjects.math}
          </Link>
        </li>
        {(["arabic", "french"] as const).map((subject) => (
          <li key={subject} className="flex h-full flex-col gap-2 rounded-2xl border border-line bg-card p-5 opacity-60">
            <span className="text-lg font-bold">{dict.subjects[subject]}</span>
            <span className="text-sm text-muted">{dict.learn.comingSoon}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
