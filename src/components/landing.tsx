import Image from "next/image";
import { ChildAvatar } from "@/components/child-avatar";
import { Stars } from "@/components/stars";
import type { Dictionary } from "@/i18n/dictionaries";

type Mock = Dictionary["home"]["mock"];
type Dash = Dictionary["home"]["dash"];

// Eight-pointed zellige star tiled as a pattern; decorative background for coloured bands.
export function ZelligePattern({ id, className = "" }: { id: string; className?: string }) {
  return (
    <svg aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}>
      <defs>
        <pattern id={id} width="64" height="64" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="18" y="18" width="28" height="28" />
            <rect x="18" y="18" width="28" height="28" transform="rotate(45 32 32)" />
            <circle cx="32" cy="32" r="5" />
            <path d="M0 32h8M56 32h8M32 0v8M32 56v8" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

// Photo framed in a Moroccan arch (round top, soft bottom corners) with an offset outline behind it.
export function ArchPhoto({
  src,
  width,
  height,
  sizes,
  preload = false,
  ring = "border-sun",
  className = "",
}: {
  src: string;
  width: number;
  height: number;
  sizes: string;
  preload?: boolean;
  ring?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <div aria-hidden="true" className={`absolute inset-0 translate-x-4 translate-y-4 rounded-t-full rounded-b-[2.5rem] border-4 ${ring} rtl:-translate-x-4`} />
      <div className="relative overflow-hidden rounded-t-full rounded-b-[2.5rem] shadow-2xl shadow-black/20">
        <Image src={src} alt="" width={width} height={height} sizes={sizes} preload={preload} className="h-full w-full object-cover" />
      </div>
    </div>
  );
}

// Phone outline around a piece of UI.
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[22rem] rounded-[3rem] bg-[#1f2a44] p-3 shadow-2xl shadow-brand/20 ring-1 ring-white/10">
      <div aria-hidden="true" className="absolute start-1/2 top-3 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-[#1f2a44] rtl:translate-x-1/2" />
      <div className="overflow-hidden rounded-[2.4rem] bg-background text-foreground">{children}</div>
    </div>
  );
}

// Static picture of a lesson (video, one exercise, stars). Purely illustrative, not interactive.
export function LessonMockup({ mock, inPhone = false }: { mock: Mock; inPhone?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={
        inPhone
          ? "relative w-full bg-card px-5 pb-6 pt-11"
          : "relative mx-auto w-full max-w-md rounded-[2rem] border border-line bg-card p-5 shadow-xl shadow-brand/10"
      }
    >
      <p className="text-xs font-bold text-muted">{mock.unit}</p>
      <p className="mt-1 text-lg font-extrabold leading-snug">{mock.lesson}</p>

      <div className="relative mt-4 flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-hero-from to-hero-to">
        <ZelligePattern id="mock-video" className="text-white/15" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-lg">
          <svg viewBox="0 0 24 24" width="28" height="28" className="ml-1 text-brand">
            <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
          </svg>
        </span>
        <span className="absolute bottom-3 start-3 rounded-full bg-black/30 px-3 py-1 text-xs font-bold text-white">
          {mock.video} · 3:24
        </span>
      </div>

      <div className="mt-4 rounded-2xl bg-brand-soft/60 p-4">
        <p className="font-bold">{mock.question}</p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {[3, 5, 2].map((n) => (
            <span
              key={n}
              className={
                n === 5
                  ? "flex h-14 items-center justify-center rounded-xl border-2 border-mint bg-mint-soft text-2xl font-extrabold text-mint"
                  : "flex h-14 items-center justify-center rounded-xl border-2 border-line bg-card text-2xl font-extrabold"
              }
            >
              {n}
            </span>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-2 text-sm font-bold text-mint">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {mock.correct}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm font-bold text-muted">{mock.stars}</span>
        <Stars count={3} size={26} label="" />
      </div>
    </div>
  );
}

const WEEK = [12, 18, 9, 22, 15, 26, 20];

// Static picture of the parents' dashboard with example numbers.
export function DashboardMockup({ mock, dash }: { mock: Mock; dash: Dash }) {
  const max = Math.max(...WEEK);
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-md rounded-[2rem] border border-line bg-card p-5 shadow-xl shadow-brand/10">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-extrabold">{dash.title}</p>
        <div className="flex gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-sm font-bold text-white">
            <ChildAvatar name={mock.childA} avatarPath="/avatars/fox.svg" size={20} />
            {mock.childA}
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-sm font-bold">
            <ChildAvatar name={mock.childB} avatarPath="/avatars/owl.svg" size={20} />
            {mock.childB}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Tile label={dash.stars} value="24" tone="bg-sun-soft text-sun" />
        <Tile label={dash.lessons} value="8" tone="bg-mint-soft text-mint" />
        <Tile label={dash.correct} value="92%" tone="bg-coral-soft text-coral" />
      </div>

      <p className="mt-5 text-sm font-bold text-muted">{dash.week}</p>
      <div className="mt-3 flex h-28 items-end gap-2">
        {WEEK.map((m, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-muted">{m}</span>
            <span
              className={`w-full rounded-t-lg ${i === WEEK.length - 2 ? "bg-sun" : "bg-brand/70"}`}
              style={{ height: `${(m / max) * 80}px` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`flex flex-col gap-1 rounded-2xl p-3 ${tone}`}>
      <span className="text-2xl font-extrabold">{value}</span>
      <span className="text-[11px] font-bold leading-tight text-foreground/70">{label}</span>
    </div>
  );
}
