import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { LoginForm } from "./login-form";

export default async function LoginPage({ params }: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href={`/${lang}`} className="text-2xl font-extrabold text-brand">
          {dict.meta.title}
        </Link>
        <LanguageSwitcher current={lang} />
      </header>
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">{dict.auth.title}</h1>
        <p className="text-muted">{dict.auth.lead}</p>
      </section>
      {/* useSearchParams in the form needs a boundary so the rest of the page stays static */}
      <Suspense fallback={<p className="text-muted">{dict.common.loading}</p>}>
        <LoginForm lang={lang} t={dict.auth} />
      </Suspense>
    </main>
  );
}
