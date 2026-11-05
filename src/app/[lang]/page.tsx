import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { ChildAvatar } from "@/components/child-avatar";
import { DashboardMockup, LessonMockup, PhoneFrame, ZelligePattern } from "@/components/landing";
import { ChatDemo, CountUp, MiniQuiz, TikoVideo } from "@/components/landing-interactive";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ProgramExplorer } from "@/components/program-explorer";
import { Stars } from "@/components/stars";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { getCurriculumPreview, type PreviewGrade } from "@/lib/curriculum-preview";

type Home = Dictionary["home"];

const AVATARS = ["fox", "owl", "cat", "bear", "rabbit", "lion", "turtle", "robot"];

// Public start page for parents and children. The robot "Tiko" is our mascot; the AI teacher it
// stands for is not built yet, so that section is marked as coming soon on the page itself.
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
        <LessonTicker curriculum={curriculum} />
        <TryIt t={t} signUp={signUp} />
        <Subjects t={t} dict={dict} signUp={signUp} />
        <HowItWorks t={t} />
        <AiTeacher t={t} />
        <Program t={t} dict={dict} curriculum={curriculum} />
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

function ButtonLink({ href, children, variant = "brand" }: { href: string; children: ReactNode; variant?: "brand" | "sun" }) {
  const look =
    variant === "sun"
      ? "bg-sun text-[#1f2a44] shadow-black/20 focus-visible:outline-white"
      : "bg-brand text-white shadow-brand/30 focus-visible:outline-brand";
  return (
    <Link
      href={href}
      className={`group inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-lg font-extrabold shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl focus-visible:outline-3 focus-visible:outline-offset-2 ${look}`}
    >
      {children}
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="transition group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1">
        <path d="M5 12h13m-5-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
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

function SectionHeading({ id, title, lead, align = "center", light = false }: { id: string; title: string; lead: string; align?: "center" | "start"; light?: boolean }) {
  return (
    <div className={align === "center" ? "mx-auto flex max-w-2xl flex-col items-center gap-4 text-center" : "flex flex-col gap-4 text-start"}>
      <h2 id={id} className="text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-[2.75rem]">
        {title}
      </h2>
      <p className={`text-pretty text-lg sm:text-xl ${light ? "text-white/85" : "text-muted"}`}>{lead}</p>
    </div>
  );
}

const ICONS = {
  play: <path d="M8 5.5v13l10-6.5z" />,
  pencil: <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />,
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9z" />,
};

function Icon({ name, className = "" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
          {(["how", "program", "parents", "faq"] as const).map((id) => (
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

// Decorative symbols drifting across the hero: position, size, colour and timing.
const SYMBOLS: { char: string; className: string; delay: string }[] = [
  { char: "1", className: "start-[6%] top-[14%] text-5xl text-sun", delay: "0s" },
  { char: "+", className: "start-[44%] top-[8%] text-4xl text-white/70", delay: "-2s" },
  { char: "أ", className: "start-[3%] bottom-[22%] text-6xl text-mint-soft", delay: "-4s" },
  { char: "3", className: "end-[4%] top-[12%] text-6xl text-coral-soft", delay: "-1s" },
  { char: "★", className: "end-[40%] bottom-[16%] text-4xl text-sun", delay: "-3s" },
  { char: "A", className: "start-[38%] bottom-[10%] text-5xl text-white/60", delay: "-5s" },
  { char: "ب", className: "end-[6%] bottom-[24%] text-5xl text-sun-soft", delay: "-6s" },
  { char: "=", className: "start-[22%] top-[4%] text-4xl text-white/50", delay: "-7s" },
  { char: "△", className: "end-[30%] top-[6%] text-4xl text-mint-soft", delay: "-2.5s" },
];

function Hero({ t, signUp }: { t: Home; signUp: string }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-hero-from via-[#2b84d6] to-hero-to text-white">
      <ZelligePattern id="hero-pattern" className="text-white/[0.07]" />
      <div aria-hidden="true" className="absolute -end-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-sun/30 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-40 -start-32 h-[28rem] w-[28rem] rounded-full bg-mint/40 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden select-none font-extrabold md:block">
        {SYMBOLS.map((s) => (
          <span key={s.char} className={`absolute animate-drift drop-shadow-lg ${s.className}`} style={{ animationDelay: s.delay }}>
            {s.char}
          </span>
        ))}
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-32 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:pb-40 lg:pt-20">
        <div className="flex animate-rise flex-col items-start gap-7 text-start">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-extrabold ring-1 ring-white/25 backdrop-blur">
            <span aria-hidden="true" className="flex gap-0.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#c1272d]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#006233]" />
            </span>
            {t.eyebrow}
          </span>
          <h1 className="text-balance text-[2.7rem] font-extrabold leading-[1.08] tracking-tight drop-shadow-sm sm:text-6xl lg:text-7xl">
            {t.headlineStart}
            <span className="relative inline-block -rotate-2 rounded-2xl bg-sun px-3 text-[#1f2a44] shadow-lg">{t.headlineAccent}</span>
            {t.headlineEnd}
          </h1>
          <p className="max-w-xl text-pretty text-lg leading-relaxed text-white/90 sm:text-xl">{t.lead}</p>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href={signUp} variant="sun">
              {t.start}
            </ButtonLink>
            <a href="#try" className="rounded-full bg-white/10 px-7 py-4 text-lg font-bold ring-2 ring-white/40 backdrop-blur transition hover:bg-white/20">
              {t.secondary}
            </a>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-white/90">
            {t.reassure.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="text-sun" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[22rem] sm:max-w-[26rem]">
          <div aria-hidden="true" className="absolute -inset-6 animate-[spin_50s_linear_infinite] rounded-full border-2 border-dashed border-white/35" />
          <div aria-hidden="true" className="absolute -inset-12 rounded-full border border-white/15" />
          <div className="relative h-full w-full overflow-hidden rounded-full bg-[#e9f4ff] shadow-2xl shadow-black/25 ring-8 ring-white/25">
            <TikoVideo />
          </div>

          <div className="absolute -top-4 start-0 max-w-[15rem] animate-pop rounded-3xl rounded-es-md bg-white px-5 py-3 text-[#1f2a44] shadow-xl [animation-delay:0.6s] sm:-start-10">
            <p className="text-xs font-extrabold text-mint">{t.tiko.name}</p>
            <p className="font-extrabold">{t.tiko.hello}</p>
          </div>
          <a
            href="#try"
            className="absolute -bottom-2 end-0 flex max-w-[16rem] animate-pop items-center gap-2 rounded-3xl rounded-ee-md bg-sun px-5 py-3 font-extrabold text-[#1f2a44] shadow-xl transition [animation-delay:1.4s] hover:scale-105 sm:-end-8"
          >
            {t.tiko.ask}
          </a>
          <span aria-hidden="true" className="absolute -end-4 top-1/3 flex animate-float items-center gap-1 rounded-2xl bg-white px-3 py-2 shadow-xl">
            <Stars count={3} size={18} label="" />
          </span>
        </div>
      </div>

      <svg viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-x-0 bottom-0 h-16 w-full text-background lg:h-24">
        <path d="M0 50C200 95 420 95 720 60S1240 0 1440 40v50H0z" fill="currentColor" />
      </svg>
    </section>
  );
}

/* ---------- lesson ticker ---------- */

function TickerRow({ titles, reverse = false, tone }: { titles: string[]; reverse?: boolean; tone: string }) {
  return (
    <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <ul className={`flex w-max shrink-0 gap-3 pe-3 hover:[animation-play-state:paused] ${reverse ? "animate-marquee-reverse" : "animate-marquee"}`}>
        {[...titles, ...titles].map((title, i) => (
          <li key={i} dir="auto" aria-hidden={i >= titles.length} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${tone}`}>
            <span aria-hidden="true">✦</span>
            {title}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LessonTicker({ curriculum }: { curriculum: PreviewGrade[] }) {
  const titles = curriculum.flatMap((grade) => grade.units.flatMap((unit) => unit.topics));
  const half = Math.ceil(titles.length / 2);
  return (
    // Always left-to-right so the loop math works; each title still sets its own direction.
    <section aria-hidden="true" dir="ltr" className="flex flex-col gap-3 py-6">
      <TickerRow titles={titles.slice(0, half)} tone="bg-brand-soft text-brand" />
      <TickerRow titles={titles.slice(half)} reverse tone="bg-sun-soft text-foreground/80" />
    </section>
  );
}

/* ---------- try it ---------- */

function TryIt({ t, signUp }: { t: Home; signUp: string }) {
  return (
    <section id="try" aria-labelledby="try-title" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-20 sm:py-24">
      <SectionHeading id="try-title" title={t.quiz.title} lead={t.quiz.lead} />
      <div className="mt-12">
        <MiniQuiz
          questions={t.quiz.questions}
          ctaHref={signUp}
          labels={{
            question: t.quiz.question,
            correct: t.quiz.correct,
            wrong: t.quiz.wrong,
            next: t.quiz.next,
            stars: t.quiz.stars,
            done: t.quiz.done,
            again: t.quiz.again,
            cta: t.start,
          }}
        />
      </div>
    </section>
  );
}

/* ---------- subjects and numbers ---------- */

function Subjects({ t, dict, signUp }: { t: Home; dict: Dictionary; signUp: string }) {
  const subjects = [
    { key: "math", icon: "/home/subject-math.svg", tint: "bg-brand-soft", meta: t.mathMeta, ready: true },
    { key: "arabic", icon: "/home/subject-arabic.svg", tint: "bg-mint-soft", meta: t.soonMeta, ready: false },
    { key: "french", icon: "/home/subject-french.svg", tint: "bg-coral-soft", meta: t.soonMeta, ready: false },
  ] as const;
  const tones = ["text-sun", "text-mint-soft", "text-white", "text-coral-soft"];

  return (
    <section aria-labelledby="subjects-title" className="mx-auto max-w-6xl px-4 pb-20 sm:pb-24">
      <SectionHeading id="subjects-title" title={t.subjectsTitle} lead={t.subjectsLead} />
      <ul className="mt-12 grid gap-5 md:grid-cols-3">
        {subjects.map((s) => {
          const body = (
            <>
              <span className={`flex h-36 w-36 items-center justify-center rounded-[2.5rem] ${s.tint}`}>
                <Image src={s.icon} alt="" width={104} height={104} className="group-hover:animate-wiggle" />
              </span>
              <span className="text-2xl font-extrabold">{dict.subjects[s.key]}</span>
              <span className="text-muted">{s.meta}</span>
              <span className={`rounded-full px-3 py-1 text-sm font-extrabold ${s.ready ? "bg-mint-soft text-mint" : "bg-sun-soft text-sun"}`}>
                {s.ready ? t.available : t.soon}
              </span>
            </>
          );
          const card = "reveal group flex h-full flex-col items-center gap-3 rounded-[2rem] border border-line bg-card p-8 text-center";
          return (
            <li key={s.key}>
              {s.ready ? (
                <Link href={signUp} className={`${card} transition hover:-translate-y-1.5 hover:border-brand hover:shadow-2xl hover:shadow-brand/15`}>
                  {body}
                </Link>
              ) : (
                <div className={card}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="relative mt-10 overflow-hidden rounded-[2rem] bg-gradient-to-r from-hero-from to-hero-to px-6 py-10 text-white">
        <ZelligePattern id="stats-pattern" className="text-white/[0.08]" />
        <dl className="relative grid grid-cols-2 gap-8 text-center md:grid-cols-4">
          {t.stats.map((stat, i) => (
            <div key={stat.label} className="flex flex-col-reverse items-center gap-1">
              <dt className="text-sm font-bold text-white/85">{stat.label}</dt>
              <dd className={`text-5xl font-extrabold sm:text-6xl ${tones[i]}`}>
                <CountUp value={stat.value} />
              </dd>
            </div>
          ))}
        </dl>
        <p className="relative mt-8 text-center text-xs font-semibold text-white/75">{t.source}</p>
      </div>
    </section>
  );
}

/* ---------- how it works ---------- */

const STEP_TONES = ["bg-brand text-white", "bg-mint text-white", "bg-sun text-[#1f2a44]"];
const STEP_ICONS = ["play", "pencil", "star"] as const;

function HowItWorks({ t }: { t: Home }) {
  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-20 bg-brand-soft/70 py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 lg:grid-cols-2">
        <div className="flex flex-col gap-10">
          <SectionHeading id="how-title" title={t.howTitle} lead={t.howLead} align="start" />
          <ol className="flex flex-col gap-4">
            {t.steps.map((step, i) => (
              <li key={step.title} className="reveal group flex gap-5 rounded-3xl bg-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg transition group-hover:rotate-6 ${STEP_TONES[i]}`}>
                  <Icon name={STEP_ICONS[i]} className="h-7 w-7" />
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-extrabold tracking-wider text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="text-xl font-extrabold">{step.title}</h3>
                  <p className="text-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        {/* The phone sits off-centre so Tiko has room beside it instead of covering the answers. */}
        <div className="reveal relative sm:pe-36 lg:pe-40">
          <PhoneFrame>
            <LessonMockup mock={t.mock} inPhone />
          </PhoneFrame>
          <Image
            src="/home/tiko-teach.webp"
            alt=""
            width={789}
            height={900}
            sizes="180px"
            className="absolute bottom-0 end-0 hidden w-36 animate-float drop-shadow-2xl sm:block lg:w-44"
          />
        </div>
      </div>
    </section>
  );
}

/* ---------- AI teacher (coming soon) ---------- */

function AiTeacher({ t }: { t: Home }) {
  return (
    <section aria-labelledby="ai-title" className="px-4 py-20 sm:py-28">
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#1d1b4f] via-[#24307a] to-hero-from px-6 py-14 text-white sm:px-12 lg:grid-cols-2 lg:py-16">
        <ZelligePattern id="ai-pattern" className="text-white/[0.06]" />
        <div aria-hidden="true" className="absolute -bottom-24 -start-24 h-80 w-80 rounded-full bg-mint/30 blur-3xl" />
        <div className="relative flex flex-col gap-6">
          <span className="w-fit rounded-full bg-sun px-4 py-1.5 text-sm font-extrabold text-[#1f2a44]">{t.ai.badge}</span>
          <SectionHeading id="ai-title" title={t.ai.title} lead={t.ai.lead} align="start" light />
          <ul className="flex flex-col gap-3">
            {t.ai.points.map((point) => (
              <li key={point} className="flex items-center gap-3 text-lg font-semibold">
                <Check className="text-sun" />
                {point}
              </li>
            ))}
          </ul>
          <Image src="/home/tiko-think.webp" alt="" width={628} height={900} sizes="160px" className="w-28 animate-float drop-shadow-2xl sm:w-36" />
        </div>
        <div className="reveal relative rounded-[2rem] bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur sm:p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-white/15 pb-4">
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#e9f4ff]">
              <Image src="/home/tiko-wave.webp" alt="" width={44} height={52} />
            </span>
            <div className="flex flex-col">
              <span className="font-extrabold">{t.tiko.name}</span>
              <span className="text-xs font-bold text-sun">{t.ai.badge}</span>
            </div>
          </div>
          <ChatDemo labels={{ kid: t.ai.kid, tiko1: t.ai.tiko1, tiko2: t.ai.tiko2, name: t.tiko.name }} />
        </div>
      </div>
    </section>
  );
}

/* ---------- programme ---------- */

function Program({ t, dict, curriculum }: { t: Home; dict: Dictionary; curriculum: PreviewGrade[] }) {
  return (
    <section id="program" aria-labelledby="program-title" className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-12 px-4 pb-20 sm:pb-28">
      <SectionHeading id="program-title" title={t.programTitle} lead={t.programLead} />
      <ProgramExplorer
        grades={curriculum}
        labels={{ grades: dict.grades, semester: t.semester, lessonsFew: t.lessonsFew, lessonsMany: t.lessonsMany }}
      />
    </section>
  );
}

/* ---------- parents ---------- */

function ForParents({ t }: { t: Home }) {
  return (
    <section id="parents" aria-labelledby="parents-title" className="scroll-mt-20 bg-sun-soft/60 py-20 sm:py-28 dark:bg-card/40">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 lg:grid-cols-2">
        {/* Tiko sits on top of the card, clear of the child chips in its header. */}
        <div className="reveal relative order-last pt-24 lg:order-first">
          <DashboardMockup mock={t.mock} dash={t.dash} />
          <Image
            src="/home/tiko-party.webp"
            alt=""
            width={848}
            height={900}
            sizes="130px"
            className="absolute end-[12%] top-0 w-28 animate-float drop-shadow-2xl"
          />
        </div>
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
      </div>
    </section>
  );
}

/* ---------- personal ---------- */

function Personal({ t }: { t: Home }) {
  return (
    <section aria-label={t.avatarsTitle} className="mx-auto grid max-w-6xl gap-5 px-4 py-20 sm:py-28 md:grid-cols-2">
      <div className="reveal flex flex-col gap-6 rounded-[2rem] border border-line bg-card p-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-extrabold">{t.avatarsTitle}</h2>
          <p className="text-muted">{t.avatarsLead}</p>
        </div>
        <ul className="grid grid-cols-4 gap-4">
          {AVATARS.map((slug, i) => (
            <li key={slug} className={`flex justify-center ${i % 2 ? "translate-y-3" : ""}`}>
              <span className="animate-float" style={{ animationDelay: `${-i * 0.7}s` } as CSSProperties}>
                <ChildAvatar name={slug} avatarPath={`/avatars/${slug}.svg`} size={64} />
              </span>
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
          <span lang="ar" dir="rtl" className="animate-float rounded-3xl rounded-ee-md bg-white px-6 py-4 text-3xl font-extrabold text-mint shadow-lg">
            أهلًا!
          </span>
          <span lang="fr" dir="ltr" className="mb-8 animate-float-slow rounded-3xl rounded-es-md bg-sun px-6 py-4 text-3xl font-extrabold text-[#1f2a44] shadow-lg">
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
    <section aria-labelledby="offer-title" className="px-4 pb-20 sm:pb-28">
      <div className="reveal relative mx-auto max-w-4xl rounded-[2.5rem] bg-gradient-to-br from-brand via-mint to-sun p-[3px] shadow-2xl shadow-brand/20">
        <div className="relative grid items-center gap-10 overflow-hidden rounded-[calc(2.5rem-3px)] bg-card p-8 sm:p-12 md:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-6">
            <span className="w-fit rounded-full bg-sun-soft px-4 py-1.5 text-sm font-extrabold text-sun">{t.offer.badge}</span>
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
          <Image src="/home/tiko-party.webp" alt="" width={848} height={900} sizes="220px" className="mx-auto w-44 animate-float md:w-56" />
        </div>
      </div>
    </section>
  );
}

/* ---------- faq ---------- */

function Faq({ t }: { t: Home }) {
  return (
    <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-20 sm:pb-28">
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
        {["start-[45%] top-6", "end-10 top-10", "end-[30%] bottom-8"].map((pos, i) => (
          <span key={pos} aria-hidden="true" className={`absolute animate-drift text-3xl text-sun ${pos}`} style={{ animationDelay: `${-i * 2}s` }}>
            ★
          </span>
        ))}
        <Image src="/home/tiko-wave.webp" alt="" width={769} height={900} sizes="220px" className="relative mx-auto w-40 animate-float sm:w-48" />
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
          <p className="text-xs text-muted">{t.source}</p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-3 text-sm font-bold">
          {(["how", "program", "parents", "faq"] as const).map((id) => (
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
