"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { Stars } from "@/components/stars";

// Interactive pieces of the start page. All of them render their final state without
// JavaScript and skip the motion when the visitor prefers reduced motion.

const REDUCED = "(prefers-reduced-motion: reduce)";

function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(REDUCED);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

// True once the element starts entering the screen (stays true). Firing at the first pixel keeps
// the switch from the server-rendered final state to the animated start out of sight.
function useSeen<T extends Element>(ref: RefObject<T | null>) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, seen]);
  return seen;
}

/* ---------- Tiko video ---------- */

export function TikoVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (reduced) video.pause();
    else video.play().catch(() => {});
  }, [reduced]);

  return (
    <video
      ref={ref}
      autoPlay
      muted
      loop
      playsInline
      poster="/home/tiko-portal.webp"
      aria-hidden="true"
      className="h-full w-full object-cover"
    >
      <source src="/home/tiko-wave.webm" type="video/webm" />
      <source src="/home/tiko-wave.mp4" type="video/mp4" />
    </video>
  );
}

/* ---------- count-up numbers ---------- */

export function CountUp({ value, className = "" }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useSeen(ref);
  const reduced = useReducedMotion();
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    if (!seen || reduced) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1200);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [seen, reduced, value]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {shown ?? value}
    </span>
  );
}

/* ---------- typing chat ---------- */

type ChatLabels = { kid: string; tiko1: string; tiko2: string; name: string };

export function ChatDemo({ labels }: { labels: ChatLabels }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useSeen(ref);
  const reduced = useReducedMotion();
  // 0 nothing, 1 kid, 2 typing, 3 first answer, 4 typing, 5 second answer
  const [step, setStep] = useState(5);

  useEffect(() => {
    if (!seen || reduced) return;
    const timers = [0, 900, 1600, 3000, 3700, 5100].map((delay, i) => setTimeout(() => setStep(i), delay));
    return () => timers.forEach(clearTimeout);
  }, [seen, reduced]);

  const typing = (
    <div className="flex w-fit gap-1.5 rounded-2xl rounded-ss-md bg-white/15 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-2 w-2 animate-typing rounded-full bg-white" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );

  return (
    <div ref={ref} className="flex min-h-80 flex-col gap-3" aria-live="polite">
      {step >= 1 && (
        <p className="ms-auto max-w-[85%] animate-pop rounded-2xl rounded-se-md bg-sun px-4 py-3 font-bold text-[#1f2a44]">{labels.kid}</p>
      )}
      {step === 2 && typing}
      {step >= 3 && <TikoBubble name={labels.name} text={labels.tiko1} />}
      {step === 4 && typing}
      {step >= 5 && <TikoBubble name={labels.name} text={labels.tiko2} />}
    </div>
  );
}

function TikoBubble({ name, text }: { name: string; text: string }) {
  return (
    <div className="flex max-w-[90%] animate-pop items-end gap-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e9f4ff]">
        <Image src="/home/tiko-wave.webp" alt="" width={36} height={42} />
      </span>
      <p className="rounded-2xl rounded-es-md bg-white px-4 py-3 font-semibold text-[#1f2a44]">
        <span className="block text-xs font-extrabold text-mint">{name}</span>
        {text}
      </p>
    </div>
  );
}

/* ---------- mini quiz ---------- */

type Question = { q: string; options: number[]; answer: number };
type QuizLabels = {
  question: string;
  correct: string;
  wrong: string;
  next: string;
  stars: string;
  done: string;
  again: string;
  cta: string;
};

const BURST = [
  [-70, -60],
  [70, -60],
  [-90, 10],
  [90, 10],
  [-40, -95],
  [40, -95],
];

export function MiniQuiz({ questions, labels, ctaHref }: { questions: Question[]; labels: QuizLabels; ctaHref: string }) {
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<"idle" | "right" | "wrong">("idle");
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const [stars, setStars] = useState(0);
  const finished = index >= questions.length;
  const current = questions[Math.min(index, questions.length - 1)];

  function pick(option: number) {
    if (status === "right") return;
    if (option === current.answer) {
      // A star for every solved question, retries included: trying again is never punished.
      setStatus("right");
      setStars((s) => s + 1);
    } else {
      setStatus("wrong");
      setWrongPick(option);
    }
  }

  function next() {
    setIndex((i) => i + 1);
    setStatus("idle");
    setWrongPick(null);
  }

  function restart() {
    setIndex(0);
    setStatus("idle");
    setWrongPick(null);
    setStars(0);
  }

  const tiko = finished || status === "right" ? "/home/tiko-party.webp" : status === "wrong" ? "/home/tiko-think.webp" : "/home/tiko-wave.webp";

  return (
    <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
      <div className="relative mx-auto h-48 w-44 sm:h-60 sm:w-52">
        <Image key={tiko} src={tiko} alt="" fill sizes="208px" className="animate-pop object-contain drop-shadow-xl" />
      </div>

      <div className="relative rounded-[2rem] border border-line bg-card p-6 shadow-2xl shadow-brand/10 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1.5" aria-hidden="true">
            {questions.map((_, i) => (
              <span key={i} className={`h-2.5 w-8 rounded-full ${i < index || (i === index && status === "right") ? "bg-mint" : i === index ? "bg-brand" : "bg-line"}`} />
            ))}
          </div>
          <span className="flex items-center gap-2 text-sm font-bold text-muted">
            <span className="hidden sm:inline">{labels.stars}</span>
            <Stars count={stars} max={questions.length} size={18} label={`${stars} / ${questions.length}`} />
          </span>
        </div>

        {finished ? (
          <div className="mt-8 flex flex-col items-center gap-5 text-center">
            <Stars count={stars} max={questions.length} size={40} label={`${stars} / ${questions.length}`} />
            <p className="text-2xl font-extrabold">{labels.done}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href={ctaHref} className="rounded-full bg-brand px-6 py-3 font-extrabold text-white shadow-lg shadow-brand/30">
                {labels.cta}
              </Link>
              <button type="button" onClick={restart} className="rounded-full border border-line px-6 py-3 font-bold">
                {labels.again}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-6 text-sm font-bold text-muted">
              {labels.question.replace("{n}", String(index + 1)).replace("{total}", String(questions.length))}
            </p>
            <p className="mt-1 text-2xl font-extrabold sm:text-3xl">{current.q}</p>
            <div className="relative mt-6 grid grid-cols-3 gap-3 sm:gap-4">
              {current.options.map((option) => {
                const isRight = status === "right" && option === current.answer;
                const isWrong = status === "wrong" && option === wrongPick;
                return (
                  <button
                    key={`${index}-${option}`}
                    type="button"
                    onClick={() => pick(option)}
                    aria-pressed={isRight || isWrong}
                    className={`relative flex h-20 items-center justify-center rounded-2xl border-2 text-4xl font-extrabold transition hover:-translate-y-1 hover:shadow-lg sm:h-24 ${
                      isRight
                        ? "border-mint bg-mint-soft text-mint"
                        : isWrong
                          ? "animate-shake border-coral bg-coral-soft text-coral"
                          : "border-line bg-background hover:border-brand"
                    }`}
                  >
                    {option}
                    {isRight &&
                      BURST.map(([dx, dy], i) => (
                        <span
                          key={i}
                          aria-hidden="true"
                          className="pointer-events-none absolute animate-burst text-2xl text-sun"
                          style={{ "--dx": `${dx}px`, "--dy": `${dy}px` } as React.CSSProperties}
                        >
                          ★
                        </span>
                      ))}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex min-h-12 flex-wrap items-center justify-between gap-3" aria-live="polite">
              {status === "right" && <p className="font-extrabold text-mint">{labels.correct}</p>}
              {status === "wrong" && <p className="font-extrabold text-coral">{labels.wrong}</p>}
              {status === "right" && (
                <button type="button" onClick={next} className="ms-auto rounded-full bg-brand px-6 py-3 font-extrabold text-white shadow-lg shadow-brand/30">
                  {labels.next}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
