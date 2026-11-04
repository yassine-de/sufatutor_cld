import { notFound } from "next/navigation";
import { Suspense } from "react";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { getAvatars, getGrades } from "@/lib/data";
import { createChild } from "../../actions";
import { ChildForm } from "../child-form";

export default async function NewChildPage({ params }: PageProps<"/[lang]/profiles/new">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">{dict.profiles.newTitle}</h1>
      <Suspense fallback={<p className="text-muted">{dict.common.loading}</p>}>
        <NewChildForm lang={lang} />
      </Suspense>
    </main>
  );
}

async function NewChildForm({ lang }: { lang: Locale }) {
  const [dict, user, avatars, grades] = await Promise.all([
    getDictionary(lang),
    requireUser(lang),
    getAvatars(lang),
    getGrades(lang),
  ]);

  return (
    <ChildForm
      lang={lang}
      parentId={user.id}
      dict={dict}
      avatars={avatars}
      grades={grades}
      action={createChild.bind(null, lang)}
    />
  );
}
