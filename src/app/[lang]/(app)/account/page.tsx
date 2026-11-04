import { notFound } from "next/navigation";
import { Suspense } from "react";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { getParentProfile } from "@/lib/data";
import { AccountForm } from "./account-form";

export default async function AccountPage({ params }: PageProps<"/[lang]/account">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">{dict.account.title}</h1>
      <Suspense fallback={<p className="text-muted">{dict.common.loading}</p>}>
        <AccountDetails lang={lang} />
      </Suspense>
    </main>
  );
}

async function AccountDetails({ lang }: { lang: Locale }) {
  const [dict, user] = await Promise.all([getDictionary(lang), requireUser(lang)]);
  const profile = await getParentProfile(user.id);

  return (
    <AccountForm
      lang={lang}
      dict={dict}
      phone={profile?.telefon ?? user.phone ?? ""}
      name={profile?.anzeigename ?? ""}
      sprache={profile?.sprache ?? lang}
    />
  );
}
