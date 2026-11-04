"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { maskPhone, normalizePhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/client";

type ErrorKey = keyof Dictionary["auth"]["errors"];
const RESEND_SECONDS = 60;

// Two steps, no password: 1) phone number -> SMS code, 2) code -> signed in (KONZEPT.md §9).
export function LoginForm({ lang, t }: { lang: Locale; t: Dictionary["auth"] }) {
  const router = useRouter();
  const nextParam = useSearchParams().get("next");
  // Only follow redirects that stay inside the app, in the current language.
  const destination = nextParam?.startsWith(`/${lang}/`) && !nextParam.startsWith("//") ? nextParam : `/${lang}/profiles`;

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function sendCode(number: string) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return setError("notConfigured");
    setBusy(true);
    setError(null);
    const { error: authError } = await createClient().auth.signInWithOtp({ phone: number });
    setBusy(false);
    if (authError) {
      setError(authError.status === 429 ? "tooMany" : "sendFailed");
      return;
    }
    setPhone(number);
    setStep("code");
    setCode("");
    setCooldown(RESEND_SECONDS);
  }

  function onPhoneSubmit(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizePhone(phoneInput);
    if (!normalized) return setError("invalidPhone");
    void sendCode(normalized);
  }

  async function onCodeSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: authError } = await createClient().auth.verifyOtp({ phone, token: code.trim(), type: "sms" });
    if (authError) {
      setBusy(false);
      setError(authError.status === 429 ? "tooMany" : "invalidCode");
      return;
    }
    router.replace(destination);
    router.refresh();
  }

  const inputClass =
    "w-full rounded-xl border border-line bg-card px-4 py-3 text-lg tracking-wide outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";
  const buttonClass =
    "w-full rounded-full bg-brand px-6 py-3 font-bold text-white disabled:opacity-60";

  return (
    <div className="flex flex-col gap-4">
      {step === "phone" ? (
        <form onSubmit={onPhoneSubmit} className="flex flex-col gap-4" noValidate>
          <label className="flex flex-col gap-2 font-semibold">
            {t.phoneLabel}
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="06 12 34 56 78"
              className={`${inputClass} text-start`}
              required
            />
            <span className="text-sm font-normal text-muted">{t.phoneHint}</span>
          </label>
          <button type="submit" disabled={busy} className={buttonClass}>
            {busy ? t.sending : t.sendCode}
          </button>
        </form>
      ) : (
        <form onSubmit={onCodeSubmit} className="flex flex-col gap-4" noValidate>
          <p className="text-muted">
            {t.codeSent.replace("{phone}", maskPhone(phone))}
          </p>
          <label className="flex flex-col gap-2 font-semibold">
            {t.codeLabel}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              dir="ltr"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
              autoFocus
              required
            />
          </label>
          <button type="submit" disabled={busy || code.length !== 6} className={buttonClass}>
            {busy ? t.verifying : t.verify}
          </button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button type="button" onClick={() => { setStep("phone"); setError(null); }} className="font-semibold text-brand underline">
              {t.changeNumber}
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || busy}
              onClick={() => void sendCode(phone)}
              className="font-semibold text-brand underline disabled:text-muted disabled:no-underline"
            >
              {cooldown > 0 ? t.resendIn.replace("{seconds}", String(cooldown)) : t.resend}
            </button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-800 dark:bg-red-950 dark:text-red-200">
          {t.errors[error]}
        </p>
      )}
    </div>
  );
}
