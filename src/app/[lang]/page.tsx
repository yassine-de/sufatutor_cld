import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ChildAvatar } from "@/components/child-avatar";
import { ArchPhoto, DashboardMockup, LessonMockup, PhoneFrame, ZelligePattern } from "@/components/landing";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ProgramExplorer } from "@/components/program-explorer";
import { Stars } from "@/components/stars";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { getCurriculumPreview, type PreviewGrade } from "@/lib/curriculum-preview";

type Home = Dictionary["home"];

const AVATARS = ["fox", "owl", "cat", "bear", "rabbit", "lion", "turtle", "robot"];

// Public start page: what TA3LIM is, for parents deciding whether to sign up.
// Mascot, photos and subject icons are our own (public/home); every claim on the page is true for the product today.
export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.home;
  const signUp = `/${lang}/login`;
  const curriculum = getCurriculumPreview(lang);

  return (
    <div className="flex flex-1 flex-col overflow-x-clip">
      <SiteHeader lang={lang} title={dict.meta.title} t={t} signUp={signUp} />
      <main className="flex-1">
        <Hero t={t} signUp={signUp} />
        <TrustBar t={t} />
        <Why t={t} firstGrade={curriculum[0]} />
        <Program t={t} dict={dict} curriculum={curriculum} />
        <HowItWorks t={t} />
        <LessonShowcase t={t} />
        <ForParents t={t} />
        <Personal t={t} />
        <Offer t={t} signUp={signUp} />
        <Faq t={t} />
        <FinalCta t={t} signUp={signUp} />
      </main>
      <SiteFooter lang={lang} title={dict.meta.title} t={t} />
    </div>
  );
}

/* ---------- shared bits ---------- */

function Logo({ title }: { title: string }) {
  return (
    <span className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-brand">
      <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
        <rect x="7" y="7" width="18" height="18" rx="3" fill="var(--sun)" />
        <rect x="7" y="7" width="18" height="18" rx="3" fill="var(--brand)" transform="rotate(45 16 16)" opacity="0.92" />
        <circle cx="16" cy="16" r="4" fill="#fff" />
      </svg>
      {title}
    </span>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="transition group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1">
      <path d="M5 12h13m-5-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ButtonLink({ href, children, variant = "brand" }: { href: string; children: ReactNode; variant?: "brand" | "sun" }) {
  const look =
    variant === "sun"
      ? "bg-sun text-[#1f2a44] shadow-black/15 focus-visible:outline-white"
      : "bg-brand text-white shadow-brand/30 focus-visible:outline-brand";
  return (
    <Link
      href={href}
      className={`group inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-lg font-extrabold shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl focus-visible:outline-3 focus-visible:outline-offset-2 ${look}`}
    >
      {children}
      <Arrow />
    </Link>
  );
}

function Check({ className = "text-mint" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className={`shrink-0 ${className}`}>
      <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.15" />
      <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Eyebrow({ children, tone = "text-brand bg-brand-soft" }: { children: ReactNode; tone?: string }) {
  return <span className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-sm font-extrabold ${tone}`}>{children}</span>;
}

function SectionHeading({ id, title, lead, align = "center" }: { id: string; title: string; lead: string; align?: "center" | "start" }) {
  return (
    <div className={align === "center" ? "mx-auto flex max-w-2xl flex-col items-center gap-4 text-center" : "flex flex-col gap-4 text-start"}>
      <h2 id={id} className="text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-[2.75rem]">
        {title}
      </h2>
      <p className="text-pretty text-lg text-muted sm:text-xl">{lead}</p>
    </div>
  );
}

// Small line icons used in the trust bar and the "why" grid.
const ICONS: Record<string, ReactNode> = {
  book: <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5M8 7h8M8 11h6" />,
  layers: <path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5" />,
  chat: <path d="M4 5h11a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM18 9h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-1v3l-3.5-3" />,
  lock: <path d="M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3M12 15v2.5" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9z" />,
  devices: <path d="M3 5h13v10H3zM1 18h17M18 9h4v11h-4zM20 17.5v0" />,
  play: <path d="M8 5.5v13l10-6.5z" />,
};

function Icon({ name, className = "" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

/* ---------- header ---------- */

function SiteHeader({ lang, title, t, signUp }: { lang: Locale; title: string; t: Home; signUp: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href={`/${lang}`} aria-label={title}>
          <Logo title={title} />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 text-sm font-bold lg:flex">
          {(["program", "parents", "faq"] as const).map((id) => (
            <a key={id} href={`#${id}`} className="rounded-full px-4 py-2 text-foreground/80 transition hover:bg-brand-soft hover:text-foreground">
              {t.nav[id]}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher current={lang} />
          <Link href={signUp} className="hidden rounded-full px-4 py-2 text-sm font-bold text-foreground/80 hover:bg-brand-soft sm:block">
            {t.nav.signIn}
          </Link>
          <Link href={signUp} className="hidden rounded-full bg-brand px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-brand/25 transition hover:-translate-y-0.5 md:block">
            {t.nav.cta}
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ---------- hero ---------- */

function Hero({ t, signUp }: { t: Home; signUp: string }) {
  return (
    <section className="relative">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(55%_60%_at_85%_15%,var(--sun-soft),transparent_70%),radial-gradient(45%_55%_at_5%_85%,var(--brand-soft),transparent_70%)]"
      />
      <ZelligePattern id="hero-pattern" className="text-brand/[0.06] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-28 lg:pt-16">
        <div className="flex animate-rise flex-col items-start gap-7 text-start">
          <Eyebrow tone="bg-card text-foreground ring-1 ring-line shadow-sm">
            <span aria-hidden="true" className="flex gap-0.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#c1272d]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#006233]" />
            </span>
            {t.eyebrow}
          </Eyebrow>
          <h1 className="text-balance text-[2.6rem] font-extrabold leading-[1.08] tracking-tight sm:text-6xl lg:text-[4.3rem]">
            {t.headlineStart}
            <span className="relative whitespace-nowrap text-brand">
              {t.headlineAccent}
              <svg viewBox="0 0 220 16" preserveAspectRatio="none" aria-hidden="true" className="absolute -bottom-[0.02em] start-0 h-[0.22em] w-full text-sun">
                <path d="M3 12c50-9 140-12 214-4" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
              </svg>
            </span>
            {t.headlineEnd}
          </h1>
          <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted sm:text-xl">{t.lead}</p>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href={signUp}>{t.start}</ButtonLink>
            <a
              href="#program"
              className="rounded-full border border-line bg-card px-7 py-4 text-lg font-bold shadow-sm transition hover:border-brand hover:text-brand"
            >
              {t.secondary}
            </a>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-muted">
            {t.reassure.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[26rem] animate-rise [animation-delay:120ms] lg:max-w-[28rem]">
          <ArchPhoto src="/home/family-mother.webp" width={1000} height={1120} sizes="(min-width: 1024px) 448px, 90vw" preload />

          <div className="absolute -start-6 top-14 flex animate-float-slow items-center gap-3 rounded-2xl bg-card/95 p-3 pe-5 shadow-2xl backdrop-blur sm:-start-12">
            <ChildAvatar name={t.heroCard.child} avatarPath="/avatars/fox.svg" size={44} />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-muted">
                {t.heroCard.child} · {t.heroCard.today}
              </span>
              <span className="text-sm font-extrabold">{t.heroCard.minutes}</span>
            </div>
          </div>

          <div className="absolute -end-4 top-1/2 hidden w-56 animate-float rounded-2xl sm:block bg-card/95 p-4 shadow-2xl backdrop-blur sm:-end-10">
            <p className="text-xs font-bold text-muted">{t.heroCard.unit}</p>
            <p className="text-sm font-extrabold">{t.heroCard.lesson}</p>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-brand-soft">
              <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-brand to-mint rtl:bg-gradient-to-l" />
            </div>
            <p className="mt-2 text-xs font-bold text-mint">{t.heroCard.progress}</p>
          </div>

          <div className="absolute -bottom-6 start-4 flex animate-float-slow items-center gap-3 rounded-2xl bg-card/95 px-4 py-3 shadow-2xl backdrop-blur">
            <Stars count={3} size={22} label="" />
            <span className="text-sm font-extrabold">{t.heroCard.done}</span>
          </div>

          <Image
            src="/home/fennec-wave.webp"
            alt=""
            width={724}
            height={900}
            sizes="140px"
            className="absolute -bottom-10 -end-2 w-28 drop-shadow-xl sm:-end-8 sm:w-36"
          />
        </div>
      </div>
    </section>
  );
}

/* ---------- trust ---------- */

function TrustBar({ t }: { t: Home }) {
  const icons = ["book", "layers", "chat", "lock"] as const;
  return (
    <section aria-label={t.trust.source} className="relative z-10 mx-auto max-w-6xl px-4">
      <div className="flex flex-col gap-6 rounded-3xl border border-line bg-card p-6 shadow-xl shadow-brand/5 lg:flex-row lg:items-center lg:justify-between lg:p-7">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-white">
            <Icon name="book" className="h-7 w-7" />
          </span>
          <div className="flex flex-col">
            <span className="font-extrabold">{t.trust.source}</span>
            <span className="text-sm text-muted">{t.trust.sourceDetail}</span>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 lg:flex lg:gap-8">
          {t.trust.items.map((item, i) => (
            <li key={item} className="flex items-center gap-2 text-sm font-bold">
              <Icon name={icons[i]} className="h-5 w-5 shrink-0 text-brand" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- why ---------- */

function Why({ t, firstGrade }: { t: Home; firstGrade: PreviewGrade }) {
  const tile = "reveal relative flex flex-col gap-3 overflow-hidden rounded-[2rem] p-7";
  return (
    <section aria-labelledby="why-title" className="mx-auto max-w-6xl px-4 py-24 sm:py-28">
      <SectionHeading id="why-title" title={t.whyTitle} lead={t.whyLead} />
      <div className="mt-14 grid gap-5 md:grid-cols-6">
        <article className={`${tile} border border-line bg-card md:col-span-4 md:row-span-2`}>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <Icon name="book" />
          </span>
          <h3 className="text-2xl font-extrabold">{t.why.program.title}</h3>
          <p className="max-w-lg text-muted">{t.why.program.text}</p>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {firstGrade.units.slice(0, 4).map((unit, i) => (
              <li key={unit.label} className="flex items-center gap-3 rounded-2xl bg-background p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-extrabold text-white">{i + 1}</span>
                <span className="flex flex-col">
                  <span className="text-[11px] font-bold text-muted">{unit.label}</span>
                  <span className="text-sm font-extrabold leading-snug">{unit.title}</span>
                </span>
              </li>
            ))}
          </ol>
          <Image src="/home/subject-math.svg" alt="" width={120} height={120} className="pointer-events-none absolute end-6 top-6 hidden w-24 rotate-6 sm:block" />
        </article>

        <article className={`${tile} bg-sun-soft md:col-span-2`}>
          <Stars count={3} size={30} label="" />
          <h3 className="text-xl font-extrabold">{t.why.stars.title}</h3>
          <p className="text-foreground/75">{t.why.stars.text}</p>
        </article>

        <article className={`${tile} bg-mint-soft md:col-span-2`}>
          <div aria-hidden="true" className="flex gap-2">
            <span lang="ar" className="rounded-2xl rounded-ee-sm bg-card px-3 py-1.5 font-extrabold text-mint shadow-sm">
              أهلًا
            </span>
            <span lang="fr" className="rounded-2xl rounded-es-sm bg-mint px-3 py-1.5 font-extrabold text-white shadow-sm">
              Salut
            </span>
          </div>
          <h3 className="text-xl font-extrabold">{t.why.bilingual.title}</h3>
          <p className="text-foreground/75">{t.why.bilingual.text}</p>
        </article>

        {(
          [
            ["parents", "chart", "bg-brand-soft text-brand"],
            ["safe", "lock", "bg-coral-soft text-coral"],
            ["devices", "devices", "bg-sun-soft text-sun"],
          ] as const
        ).map(([key, icon, tone]) => (
          <article key={key} className={`${tile} border border-line bg-card md:col-span-2`}>
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
              <Icon name={icon} />
            </span>
            <h3 className="text-xl font-extrabold">{t.why[key].title}</h3>
            <p className="text-muted">{t.why[key].text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- programme ---------- */

function Program({ t, dict, curriculum }: { t: Home; dict: Dictionary; curriculum: PreviewGrade[] }) {
  const subjects = [
    { key: "math", icon: "/home/subject-math.svg", ready: true },
    { key: "arabic", icon: "/home/subject-arabic.svg", ready: false },
    { key: "french", icon: "/home/subject-french.svg", ready: false },
  ] as const;

  return (
    <section id="program" aria-labelledby="program-title" className="relative scroll-mt-20 bg-brand-soft/80 py-24 sm:py-28">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4">
        <SectionHeading id="program-title" title={t.programTitle} lead={t.programLead} />
        <ul aria-label={t.nav.subjects} className="flex flex-wrap justify-center gap-3">
          {subjects.map((s) => (
            <li
              key={s.key}
              className={`flex items-center gap-3 rounded-2xl border bg-card py-2 pe-4 ps-2 ${s.ready ? "border-brand shadow-lg shadow-brand/10" : "border-line opacity-80"}`}
            >
              <Image src={s.icon} alt="" width={44} height={44} />
              <span className="font-extrabold">{dict.subjects[s.key]}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${s.ready ? "bg-mint-soft text-mint" : "bg-sun-soft text-sun"}`}
              >
                {s.ready ? t.available : t.soon}
              </span>
            </li>
          ))}
        </ul>
        <ProgramExplorer
          grades={curriculum}
          labels={{ grades: dict.grades, semester: t.semester, lessonsFew: t.lessonsFew, lessonsMany: t.lessonsMany }}
        />
      </div>
    </section>
  );
}

/* ---------- how it works ---------- */

const STEP_TONES = ["bg-brand text-white", "bg-mint text-white", "bg-sun text-[#1f2a44]"];
const STEP_ICONS = ["play", "chat", "star"] as const;

function HowItWorks({ t }: { t: Home }) {
  return (
    <section aria-labelledby="how-title" className="mx-auto grid max-w-6xl items-center gap-16 px-4 py-24 sm:py-28 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="reveal relative mx-auto w-full max-w-sm">
        <ArchPhoto src="/home/family-boy.webp" width={1000} height={1333} sizes="(min-width: 1024px) 384px, 90vw" ring="border-mint" />
        <div className="absolute -end-4 top-10 flex animate-float items-center gap-2 rounded-2xl bg-card px-4 py-3 shadow-2xl sm:-end-10">
          <span className="text-2xl font-extrabold text-sun">+3</span>
          <Stars count={3} size={20} label="" />
        </div>
        <Image src="/home/fennec-celebrate.webp" alt="" width={880} height={900} sizes="140px" className="absolute -bottom-8 -start-6 w-32 drop-shadow-xl" />
      </div>

      <div className="flex flex-col gap-10">
        <SectionHeading id="how-title" title={t.howTitle} lead={t.howLead} align="start" />
        <ol className="relative flex flex-col gap-8">
          <span aria-hidden="true" className="absolute bottom-6 start-7 top-6 w-0.5 bg-gradient-to-b from-brand via-mint to-sun" />
          {t.steps.map((step, i) => (
            <li key={step.title} className="reveal relative flex gap-5">
              <span className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg ${STEP_TONES[i]}`}>
                <Icon name={STEP_ICONS[i]} className="h-7 w-7" />
              </span>
              <div className="flex flex-col gap-1 pt-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-muted">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="text-xl font-extrabold">{step.title}</h3>
                <p className="text-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- lesson ---------- */

function LessonShowcase({ t }: { t: Home }) {
  return (
    <section aria-labelledby="lesson-title" className="px-4">
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-hero-from to-hero-to px-6 py-16 text-white sm:px-12 lg:grid-cols-2 lg:py-20">
        <ZelligePattern id="lesson-pattern" className="text-white/[0.08]" />
        <div aria-hidden="true" className="absolute -end-20 -top-20 h-80 w-80 rounded-full bg-sun/25 blur-3xl" />
        <div className="relative flex flex-col gap-6">
          <Eyebrow tone="bg-white/15 text-white ring-1 ring-white/25">
            <Icon name="play" className="h-4 w-4" />
            {t.steps[0].title} · {t.steps[1].title} · {t.steps[2].title}
          </Eyebrow>
          <h2 id="lesson-title" className="text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-[2.75rem]">
            {t.lessonTitle}
          </h2>
          <p className="text-lg text-white/85 sm:text-xl">{t.lessonLead}</p>
          <ul className="flex flex-col gap-3">
            {t.lessonPoints.map((point) => (
              <li key={point} className="flex items-start gap-3 text-lg font-semibold">
                <Check className="text-sun" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="reveal relative">
          <PhoneFrame>
            <LessonMockup mock={t.mock} inPhone />
          </PhoneFrame>
          <Image src="/home/fennec-read.webp" alt="" width={717} height={900} sizes="150px" className="absolute bottom-4 start-0 hidden w-28 drop-shadow-2xl sm:block lg:-start-4" />
        </div>
      </div>
    </section>
  );
}

/* ---------- parents ---------- */

function ForParents({ t }: { t: Home }) {
  return (
    <section id="parents" aria-labelledby="parents-title" className="mx-auto grid max-w-6xl scroll-mt-20 items-center gap-16 px-4 py-24 sm:py-28 lg:grid-cols-2">
      <div className="flex flex-col gap-8">
        <SectionHeading id="parents-title" title={t.parentsTitle} lead={t.parentsLead} align="start" />
        <ul className="grid gap-3 sm:grid-cols-2">
          {t.parentsPoints.map((point) => (
            <li key={point} className="reveal flex items-start gap-3 rounded-2xl border border-line bg-card p-4 font-semibold">
              <Check className="text-brand" />
              {point}
            </li>
          ))}
        </ul>
      </div>
      {/* Physical left/right on purpose: the faces sit on the left of the photo, which is not mirrored in RTL. */}
      <div className="reveal relative mx-auto w-full max-w-lg sm:pb-36">
        <ArchPhoto src="/home/family-father.webp" width={1000} height={1120} sizes="(min-width: 1024px) 420px, 80vw" ring="border-brand" className="mr-auto w-[80%]" />
        <div className="relative -mt-16 sm:absolute sm:bottom-0 sm:right-0 sm:mt-0 sm:w-[74%]">
          <DashboardMockup mock={t.mock} dash={t.dash} />
        </div>
      </div>
    </section>
  );
}

/* ---------- personal ---------- */

function Personal({ t }: { t: Home }) {
  return (
    <section aria-label={t.avatarsTitle} className="mx-auto grid max-w-6xl gap-5 px-4 pb-24 sm:pb-28 md:grid-cols-2">
      <div className="reveal flex flex-col gap-6 rounded-[2rem] border border-line bg-card p-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-extrabold">{t.avatarsTitle}</h2>
          <p className="text-muted">{t.avatarsLead}</p>
        </div>
        <ul className="grid grid-cols-4 gap-4">
          {AVATARS.map((slug, i) => (
            <li key={slug} className={`flex justify-center transition hover:-translate-y-1 ${i % 2 ? "translate-y-3" : ""}`}>
              <ChildAvatar name={slug} avatarPath={`/avatars/${slug}.svg`} size={64} />
            </li>
          ))}
        </ul>
      </div>
      <div className="reveal relative flex flex-col gap-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-mint to-hero-from p-8 text-white">
        <ZelligePattern id="lang-pattern" className="text-white/10" />
        <div className="relative flex flex-col gap-2">
          <h2 className="text-2xl font-extrabold">{t.langTitle}</h2>
          <p className="text-white/90">{t.langLead}</p>
        </div>
        <div aria-hidden="true" className="relative mt-auto flex items-end justify-center gap-4">
          <span lang="ar" dir="rtl" className="rounded-3xl rounded-ee-md bg-white px-6 py-4 text-3xl font-extrabold text-mint shadow-lg">
            أهلًا!
          </span>
          <span lang="fr" dir="ltr" className="mb-8 rounded-3xl rounded-es-md bg-sun px-6 py-4 text-3xl font-extrabold text-[#1f2a44] shadow-lg">
            Salut !
          </span>
        </div>
      </div>
    </section>
  );
}

/* ---------- offer ---------- */

function Offer({ t, signUp }: { t: Home; signUp: string }) {
  return (
    <section aria-labelledby="offer-title" className="px-4 pb-24 sm:pb-28">
      <div className="reveal relative mx-auto max-w-4xl rounded-[2.5rem] bg-gradient-to-br from-brand via-mint to-sun p-[3px] shadow-2xl shadow-brand/20">
        <div className="relative grid items-center gap-10 overflow-hidden rounded-[calc(2.5rem-3px)] bg-card p-8 sm:p-12 md:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-6">
            <Eyebrow tone="bg-sun-soft text-sun">{t.offer.badge}</Eyebrow>
            <h2 id="offer-title" className="text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              {t.offer.title}
            </h2>
            <p className="flex items-baseline gap-3">
              <span className="text-6xl font-extrabold tracking-tight text-brand">{t.offer.price}</span>
              <span className="font-bold text-muted">{t.offer.period}</span>
            </p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {t.offer.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 font-semibold">
                  <Check />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-4">
              <ButtonLink href={signUp}>{t.offer.cta}</ButtonLink>
              <span className="text-sm font-semibold text-muted">{t.offer.note}</span>
            </div>
          </div>
          <Image src="/home/fennec-celebrate.webp" alt="" width={880} height={900} sizes="220px" className="mx-auto w-44 animate-float md:w-56" />
        </div>
      </div>
    </section>
  );
}

/* ---------- faq ---------- */

function Faq({ t }: { t: Home }) {
  return (
    <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-24 sm:pb-28">
      <h2 id="faq-title" className="text-center text-3xl font-extrabold tracking-tight sm:text-[2.75rem]">
        {t.faqTitle}
      </h2>
      <div className="mt-10 flex flex-col gap-3">
        {t.faq.map((item) => (
          <details key={item.q} className="group rounded-2xl border border-line bg-card px-6 py-5 transition open:shadow-lg open:shadow-brand/5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-extrabold [&::-webkit-details-marker]:hidden">
              {item.q}
              <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand transition group-open:rotate-45">
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                </svg>
              </span>
            </summary>
            <p className="mt-3 leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ---------- final call ---------- */

function FinalCta({ t, signUp }: { t: Home; signUp: string }) {
  return (
    <section aria-labelledby="cta-title" className="px-4 pb-20 sm:pb-24">
      <div className="relative mx-auto grid max-w-6xl items-center gap-8 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-hero-from to-hero-to px-6 py-14 text-white sm:px-14 md:grid-cols-[auto_1fr]">
        <ZelligePattern id="cta-pattern" className="text-white/10" />
        <div aria-hidden="true" className="absolute -bottom-24 -end-24 h-80 w-80 rounded-full bg-sun/30 blur-3xl" />
        <Image src="/home/fennec-wave.webp" alt="" width={724} height={900} sizes="220px" className="relative mx-auto w-40 animate-float sm:w-48" />
        <div className="relative flex flex-col items-center gap-5 text-center md:items-start md:text-start">
          <h2 id="cta-title" className="text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {t.ctaTitle}
          </h2>
          <p className="max-w-xl text-lg text-white/90">{t.ctaLead}</p>
          <ButtonLink href={signUp} variant="sun">
            {t.start}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

/* ---------- footer ---------- */

function SiteFooter({ lang, title, t }: { lang: Locale; title: string; t: Home }) {
  return (
    <footer className="border-t border-line bg-card/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-xs flex-col gap-3">
          <Logo title={title} />
          <p className="text-sm text-muted">{t.footerTagline}</p>
          <p className="text-xs text-muted">
            {t.trust.source} · {t.trust.sourceDetail}
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-3 text-sm font-bold">
          {(["program", "parents", "faq"] as const).map((id) => (
            <a key={id} href={`#${id}`} className="hover:text-brand">
              {t.nav[id]}
            </a>
          ))}
          <Link href={`/${lang}/login`} className="hover:text-brand">
            {t.nav.signIn}
          </Link>
        </nav>
        <div className="flex flex-col gap-3 md:items-end">
          <LanguageSwitcher current={lang} />
          <p className="text-xs text-muted">
            © {title} · {t.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
