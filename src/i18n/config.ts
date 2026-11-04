// UI languages. Content languages in the database also include 'darija' (see lang enum),
// but the interface itself is Arabic or French (KONZEPT.md §3, §9).
export const locales = ["ar", "fr"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

export const getDirection = (locale: Locale) => (locale === "ar" ? "rtl" : "ltr");
