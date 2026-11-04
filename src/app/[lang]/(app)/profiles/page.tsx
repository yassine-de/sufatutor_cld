import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChildAvatar } from "@/components/child-avatar";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { getChildren } from "@/lib/data";
import { selectChild } from "../actions";

// "Who is learning today?" - the screen the child sees after the parent has signed in.
export default async function ProfilesPage({ params }: PageProps<"/[lang]/profiles">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">{dict.profiles.whoIsLearning}</h1>
      <Suspense fallback={<p className="text-muted">{dict.common.loading}</p>}>
        <ChildGrid lang={lang} />
      </Suspense>
    </main>
  );
}

async function ChildGrid({ lang }: { lang: Locale }) {
  const dict = await getDictionary(lang);
  await requireUser(lang);
  const children = await getChildren();

  if (children.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-muted">{dict.profiles.empty}</p>
        <Link href={`/${lang}/profiles/new`} className="rounded-full bg-brand px-6 py-3 font-bold text-white">
          {dict.profiles.add}
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {children.map((child) => (
          <li key={child.id}>
            <form action={selectChild.bind(null, lang, child.id)}>
              <button
                type="submit"
                className="flex w-full flex-col items-center gap-3 rounded-2xl border border-line bg-card p-4 transition hover:border-brand focus-visible:outline-2 focus-visible:outline-brand"
              >
                <ChildAvatar name={child.name} avatarPath={child.avatarPath} photoSrc={child.photoSrc} size={96} />
                <span className="text-lg font-bold">{child.name}</span>
              </button>
            </form>
          </li>
        ))}
      </ul>
      <Link href={`/${lang}/profiles/manage`} className="w-fit font-semibold text-brand underline">
        {dict.profiles.manage}
      </Link>
    </>
  );
}
