"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { LOCALE_COOKIE, locales, type Locale } from "@/i18n/config";

const LABELS: Record<Locale, string> = { ar: "العربية", fr: "Français" };

function Switcher({ current, rest }: { current: Locale; rest: string }) {
  return (
    <nav aria-label="Language" className="flex gap-2">
      {locales.map((locale) => (
        <Link
          key={locale}
          href={`/${locale}${rest ? `/${rest}` : ""}`}
          lang={locale}
          aria-current={locale === current ? "true" : undefined}
          // Remember the choice so "/" later redirects to this language (read by proxy.ts).
          onClick={() => {
            document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
          }}
          className="rounded-full px-3 py-1 text-sm font-semibold aria-[current=true]:bg-brand aria-[current=true]:text-white hover:bg-brand-soft"
        >
          {LABELS[locale]}
        </Link>
      ))}
    </nav>
  );
}

// Swaps the first path segment so the user stays on the same page in the other language.
// The current path is only known at request time on dynamic routes, so it sits behind Suspense;
// until it resolves the links point to the start page of each language.
function PathAwareSwitcher({ current }: { current: Locale }) {
  const rest = usePathname().split("/").slice(2).join("/");
  return <Switcher current={current} rest={rest} />;
}

export function LanguageSwitcher({ current }: { current: Locale }) {
  return (
    <Suspense fallback={<Switcher current={current} rest="" />}>
      <PathAwareSwitcher current={current} />
    </Suspense>
  );
}
