"use client";

import { useActionState } from "react";
import { locales, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { updateAccount } from "../actions";

type Props = { lang: Locale; dict: Dictionary; phone: string; name: string; sprache: Locale };

export function AccountForm({ lang, dict, phone, name, sprache }: Props) {
  const t = dict.account;
  const [state, formAction, pending] = useActionState(updateAccount.bind(null, lang), undefined);
  const fieldClass =
    "w-full rounded-xl border border-line bg-card px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      <label className="flex flex-col gap-2 font-semibold">
        {t.phone}
        {/* The phone number is the login; changing it goes through the auth flow, not this form. */}
        <input value={phone} readOnly dir="ltr" className={`${fieldClass} text-start opacity-70`} />
      </label>
      <label className="flex flex-col gap-2 font-semibold">
        {t.name}
        <input name="anzeigename" defaultValue={name} maxLength={60} autoComplete="name" className={fieldClass} />
      </label>
      <label className="flex flex-col gap-2 font-semibold">
        {t.uiLanguage}
        <select name="sprache" defaultValue={sprache} className={fieldClass}>
          {locales.map((l) => (
            <option key={l} value={l}>
              {dict.languages[l]}
            </option>
          ))}
        </select>
      </label>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-800 dark:bg-red-950 dark:text-red-200">
          {dict.errors[state.error]}
        </p>
      )}
      {state?.saved && (
        <p role="status" className="rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-800 dark:bg-green-950 dark:text-green-200">
          {t.saved}
        </p>
      )}
      <button type="submit" disabled={pending} className="rounded-full bg-brand px-6 py-3 font-bold text-white disabled:opacity-60">
        {t.save}
      </button>
    </form>
  );
}
