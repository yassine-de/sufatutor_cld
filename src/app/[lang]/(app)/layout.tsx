import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { isAdmin } from "@/lib/admin";
import { signOut } from "./actions";

// Shell of the signed-in area. It reads no cookies itself (pages do, behind Suspense),
// so it can be part of the static shell.
export default async function AppLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/${lang}/profiles`} className="text-2xl font-extrabold text-brand">
          {dict.meta.title}
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <Link href={`/${lang}/profiles/manage`} className="rounded-full px-3 py-1 hover:bg-brand-soft">
            {dict.nav.profiles}
          </Link>
          <Link href={`/${lang}/dashboard`} className="rounded-full px-3 py-1 hover:bg-brand-soft">
            {dict.nav.dashboard}
          </Link>
          <Suspense fallback={null}>
            <AdminLink lang={lang} label={dict.nav.admin} />
          </Suspense>
          <Link href={`/${lang}/account`} className="rounded-full px-3 py-1 hover:bg-brand-soft">
            {dict.nav.account}
          </Link>
          <form action={signOut.bind(null, lang)}>
            <button type="submit" className="rounded-full px-3 py-1 hover:bg-brand-soft">
              {dict.nav.signOut}
            </button>
          </form>
          <LanguageSwitcher current={lang} />
        </nav>
      </header>
      {children}
    </div>
  );
}

// Only admins see the entry; the admin pages and the database check the role again.
async function AdminLink({ lang, label }: { lang: string; label: string }) {
  if (!(await isAdmin())) return null;
  return (
    <Link href={`/${lang}/admin`} className="rounded-full px-3 py-1 hover:bg-brand-soft">
      {label}
    </Link>
  );
}
