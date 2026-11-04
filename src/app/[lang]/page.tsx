import Link from "next/link";
import { notFound } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-6">
      <header className="flex items-center justify-between">
        <span className="text-2xl font-extrabold text-brand">{dict.meta.title}</span>
        <LanguageSwitcher current={lang} />
      </header>

      <section className="flex flex-col gap-4 text-start">
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{dict.home.headline}</h1>
        <p className="text-lg text-muted">{dict.home.lead}</p>
        <Link href={`/${lang}/login`} className="w-fit rounded-full bg-brand px-6 py-3 font-bold text-white">
          {dict.home.start}
        </Link>
      </section>

      <section aria-labelledby="subjects" className="flex flex-col gap-3">
        <h2 id="subjects" className="text-xl font-bold">
          {dict.home.subjectsTitle}
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(["math", "arabic", "french"] as const).map((subject) => (
            <li key={subject} className="rounded-2xl border border-line bg-card p-4 font-semibold">
              {dict.subjects[subject]}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
