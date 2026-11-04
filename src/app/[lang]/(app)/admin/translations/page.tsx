import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { reviewTranslation } from "../actions";

const PAGE_SIZE = 20;
type Row = Record<string, unknown>;

// Review queue (the French titles were written by us, not by a native speaker; see data/curriculum/NOTES.md).
export default async function TranslationsPage({ params }: PageProps<"/[lang]/admin/translations">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main className="flex flex-col gap-4">
      <Link href={`/${lang}/admin`} className="w-fit text-sm font-semibold text-brand underline">
        <span aria-hidden="true" className="inline-block rtl:rotate-180">←</span> {dict.admin.back}
      </Link>
      <h1 className="text-3xl font-extrabold">{dict.admin.reviewTitle}</h1>
      <p className="text-muted">{dict.admin.reviewLead}</p>
      <Suspense fallback={<p className="text-muted">{dict.common.loading}</p>}>
        <Queue lang={lang} />
      </Suspense>
    </main>
  );
}

async function Queue({ lang }: { lang: Locale }) {
  const dict = await getDictionary(lang);
  await requireAdmin(lang);
  const t = dict.admin;
  const supabase = await createClient();

  const { data, count } = await supabase
    .from("translations")
    .select("entity_type, entity_id, sprache, feld, text, quality", { count: "exact" })
    .in("quality", ["unreviewed", "derived"])
    .order("entity_type")
    .order("entity_id")
    .limit(PAGE_SIZE);
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return <p className="rounded-2xl border border-line bg-card p-4 font-semibold">{t.reviewEmpty}</p>;

  // The text in the other language helps the reviewer judge the translation.
  const { data: others } = await supabase
    .from("translations")
    .select("entity_id, sprache, feld, text")
    .in("entity_id", rows.map((r) => r.entity_id as string));
  const counterpart = (r: Row) =>
    ((others ?? []) as Row[]).find((o) => o.entity_id === r.entity_id && o.feld === r.feld && o.sprache !== r.sprache)?.text as string | undefined;

  return (
    <>
      <p className="text-sm font-semibold text-muted">{t.remaining.replace("{n}", String(count ?? rows.length))}</p>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={`${r.entity_type}:${r.entity_id}:${r.sprache}:${r.feld}`}>
            <form action={reviewTranslation.bind(null, lang)} className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-4">
              <input type="hidden" name="entity_type" value={String(r.entity_type)} />
              <input type="hidden" name="entity_id" value={String(r.entity_id)} />
              <input type="hidden" name="sprache" value={String(r.sprache)} />
              <input type="hidden" name="feld" value={String(r.feld)} />
              <p className="text-xs font-semibold text-muted">
                {String(r.entity_type)} · {String(r.feld)} · {t.language}: {dict.languages[r.sprache as Locale] ?? String(r.sprache)}
              </p>
              {counterpart(r) && (
                <p className="text-sm text-muted" dir={r.sprache === "fr" ? "rtl" : "ltr"}>
                  {counterpart(r)}
                </p>
              )}
              <textarea
                name="text"
                defaultValue={String(r.text)}
                dir={r.sprache === "ar" ? "rtl" : "ltr"}
                lang={String(r.sprache)}
                rows={2}
                maxLength={500}
                required
                className="w-full rounded-xl border border-line bg-background px-3 py-2"
              />
              <button type="submit" className="w-fit rounded-full bg-brand px-5 py-2 font-bold text-white">
                {t.reviewed}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
