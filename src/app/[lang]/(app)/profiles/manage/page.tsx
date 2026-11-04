import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChildAvatar } from "@/components/child-avatar";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { getChildLimit, getChildren } from "@/lib/data";

export default async function ManageProfilesPage({ params }: PageProps<"/[lang]/profiles/manage">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">{dict.nav.profiles}</h1>
      <Suspense fallback={<p className="text-muted">{dict.common.loading}</p>}>
        <ChildList lang={lang} />
      </Suspense>
    </main>
  );
}

async function ChildList({ lang }: { lang: Locale }) {
  const dict = await getDictionary(lang);
  await requireUser(lang);
  const [children, limit] = await Promise.all([getChildren(), getChildLimit()]);

  return (
    <>
      {children.length === 0 && <p className="text-muted">{dict.profiles.empty}</p>}
      <ul className="flex flex-col gap-3">
        {children.map((child) => (
          <li key={child.id}>
            <Link
              href={`/${lang}/profiles/${child.id}/edit`}
              className="flex items-center gap-4 rounded-2xl border border-line bg-card p-3 hover:border-brand"
            >
              <ChildAvatar name={child.name} avatarPath={child.avatarPath} photoSrc={child.photoSrc} size={56} />
              <span className="flex flex-col text-start">
                <span className="text-lg font-bold">{child.name}</span>
                <span className="text-sm text-muted">
                  {[child.gradeNumber ? dict.grades[String(child.gradeNumber) as keyof typeof dict.grades] : null, dict.languages[child.sprache]]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-4">
        {children.length < limit && (
          <Link href={`/${lang}/profiles/new`} className="rounded-full bg-brand px-6 py-3 font-bold text-white">
            {dict.profiles.add}
          </Link>
        )}
        <Link href={`/${lang}/profiles`} className="font-semibold text-brand underline">
          {dict.profiles.done}
        </Link>
      </div>
    </>
  );
}
