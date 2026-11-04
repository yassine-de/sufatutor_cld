"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Stars } from "@/components/stars";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { ExerciseView } from "@/lib/learning";
import { parseNumber } from "@/lib/number";
import { checkAnswer, finishPractice, type FinishResult } from "../../../actions";

type Props = {
  lang: Locale;
  topicId: string;
  topicTitle: string;
  topicHref: string;
  chaptersHref: string;
  nextTopic: { href: string; title: string } | null;
  exercises: ExerciseView[];
  dict: Dictionary["learn"];
  starsOfTemplate: string;
  // The server actions by default; replaced in UI tests that run without a backend.
  actions?: { check: typeof checkAnswer; finish: typeof finishPractice };
};

// Answer payloads mirror the solution format stored in the database (see migration 1).
type Answer = { index: number } | { wert: number } | { paare: [number, number][] };

const buttonPrimary = "rounded-full bg-brand px-6 py-3 font-bold text-white disabled:opacity-50";
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);

export function PracticeRunner({ lang, topicId, topicTitle, topicHref, chaptersHref, nextTopic, exercises, dict, starsOfTemplate, actions = { check: checkAnswer, finish: finishPractice } }: Props) {
  const t = dict.practice;
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [verdict, setVerdict] = useState<boolean | null>(null);
  const [error, setError] = useState(false);
  const [final, setFinal] = useState<FinishResult | null>(null);
  const [pending, startTransition] = useTransition();
  const shownAt = useRef(0); // when the current question appeared, for the answer-time statistics

  useEffect(() => {
  }, [index, final]);

  const exercise = exercises[index];
  const isLast = index === exercises.length - 1;

  function check() {
    if (!answer) return;
    setError(false);
    startTransition(async () => {
      const result = await actions.check(lang, exercise.id, answer, Date.now() - shownAt.current);
      if (!result.ok) return setError(true);
      setVerdict(result.correct);
    });
  }

  function next() {
    if (!isLast) {
      setIndex((i) => i + 1);
      setAnswer(null);
      setVerdict(null);
      return;
    }
    startTransition(async () => {
      const result = await actions.finish(lang, topicId);
      if (!result.ok) return setError(true);
      setFinal(result);
    });
  }

  function restart() {
    setIndex(0);
    setAnswer(null);
    setVerdict(null);
    setFinal(null);
  }

  if (final?.ok) {
    return (
      <section aria-live="polite" className="flex flex-col items-center gap-5 py-6 text-center">
        <h1 className="text-3xl font-extrabold">{t.resultTitle}</h1>
        <div className="animate-[pop_0.5s_ease-out]">
          <Stars count={final.stars} size={56} label={starsOfTemplate.replace("{n}", String(final.stars))} />
        </div>
        <p className="text-lg font-semibold">{t.resultLine.replace("{correct}", String(final.correct)).replace("{total}", String(final.total))}</p>
        <p className="text-muted">
          {final.stars === 0 ? t.noStars : t.starsEarned + ": " + final.stars}
          {final.bestStars > final.stars && <span className="block">{t.bestKept.replace("{n}", String(final.bestStars))}</span>}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={restart} className="rounded-full border border-brand px-6 py-3 font-bold text-brand hover:bg-brand-soft">
            {t.retry}
          </button>
          {nextTopic && final.stars > 0 ? (
            <Link href={nextTopic.href} className={buttonPrimary}>
              {dict.topic.nextTopic}
            </Link>
          ) : (
            <Link href={chaptersHref} className={buttonPrimary}>
              {t.back}
            </Link>
          )}
        </div>
      </section>
    );
  }

  const locked = verdict !== null;

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link href={topicHref} className="w-fit text-sm font-semibold text-brand underline">
          <span aria-hidden="true" className="inline-block rtl:rotate-180">←</span> {topicTitle}
        </Link>
        <p className="text-sm font-semibold text-muted">
          {t.question.replace("{n}", String(index + 1)).replace("{total}", String(exercises.length))}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-brand-soft" role="progressbar" aria-valuemin={0} aria-valuemax={exercises.length} aria-valuenow={index}>
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(index / exercises.length) * 100}%` }} />
        </div>
      </header>

      {/* key: a fresh input state for every question */}
      <Question key={exercise.id} exercise={exercise} locked={locked} verdict={verdict} onAnswer={setAnswer} dict={dict} />

      {verdict !== null && (
        <p
          role="status"
          className={`rounded-2xl px-4 py-3 font-bold ${verdict ? "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200" : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"}`}
        >
          {verdict ? "🎉 " + t.correct : t.wrong}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-800 dark:bg-red-950 dark:text-red-200">
          {t.error}
        </p>
      )}

      {verdict === null ? (
        <button type="button" onClick={check} disabled={!answer || pending} className={buttonPrimary}>
          {t.check}
        </button>
      ) : (
        <button type="button" onClick={next} disabled={pending} className={buttonPrimary}>
          {isLast ? t.finish : t.next}
        </button>
      )}
    </section>
  );
}

type QuestionProps = {
  exercise: ExerciseView;
  locked: boolean;
  verdict: boolean | null;
  onAnswer: (answer: Answer | null) => void;
  dict: Dictionary["learn"];
};

function Question({ exercise, locked, verdict, onAnswer, dict }: QuestionProps) {
  const frage = typeof exercise.daten.frage === "string" ? exercise.daten.frage : "";
  return (
    <div className="flex flex-col gap-4">
      {exercise.fragetyp !== "zuordnen" && <h1 className="text-2xl font-extrabold leading-snug">{frage}</h1>}
      {exercise.fragetyp === "multiple_choice" && (
        <MultipleChoice options={strings(exercise.daten.optionen)} locked={locked} verdict={verdict} onAnswer={onAnswer} />
      )}
      {exercise.fragetyp === "zahl_eingeben" && <NumberEntry label={dict.practice.numberLabel} locked={locked} onAnswer={onAnswer} />}
      {exercise.fragetyp === "zuordnen" && (
        <Matching
          links={strings(exercise.daten.links)}
          rights={strings(exercise.daten.rechts)}
          hint={dict.practice.matchHint}
          locked={locked}
          onAnswer={onAnswer}
        />
      )}
    </div>
  );
}

function MultipleChoice({ options, locked, verdict, onAnswer }: { options: string[]; locked: boolean; verdict: boolean | null; onAnswer: QuestionProps["onAnswer"] }) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div role="radiogroup" className="grid gap-3">
      {options.map((option, i) => {
        const chosen = selected === i;
        const tone = !chosen
          ? "border-line bg-card"
          : verdict === null
            ? "border-brand bg-brand-soft"
            : verdict
              ? "border-green-600 bg-green-100 dark:bg-green-950"
              : "border-amber-500 bg-amber-100 dark:bg-amber-950";
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={chosen}
            disabled={locked}
            onClick={() => {
              setSelected(i);
              onAnswer({ index: i });
            }}
            className={`rounded-2xl border-2 px-5 py-4 text-start text-xl font-bold transition ${tone}`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function NumberEntry({ label, locked, onAnswer }: { label: string; locked: boolean; onAnswer: QuestionProps["onAnswer"] }) {
  const [text, setText] = useState("");
  return (
    <label className="flex flex-col gap-2 font-semibold">
      {label}
      <input
        inputMode="decimal"
        autoComplete="off"
        dir="ltr"
        value={text}
        readOnly={locked}
        onChange={(e) => {
          setText(e.target.value);
          const value = parseNumber(e.target.value);
          onAnswer(value === null ? null : { wert: value });
        }}
        className="w-full rounded-2xl border-2 border-line bg-card px-5 py-4 text-start text-3xl font-extrabold outline-none focus:border-brand"
      />
    </label>
  );
}

// Tap an item on one side, then its partner on the other. Pairs get a matching colour.
const PAIR_COLOURS = ["#2f6fed", "#e8590c", "#2b9348", "#9c36b5", "#c2255c", "#0c8599"];

function Matching({ links, rights, hint, locked, onAnswer }: { links: string[]; rights: string[]; hint: string; locked: boolean; onAnswer: QuestionProps["onAnswer"] }) {
  const [pairs, setPairs] = useState<Map<number, number>>(new Map());
  const [active, setActive] = useState<number | null>(null);

  function report(next: Map<number, number>) {
    setPairs(next);
    onAnswer(next.size === links.length ? { paare: [...next.entries()] } : null);
  }
  function pickLeft(i: number) {
    if (locked) return;
    if (pairs.has(i)) {
      const next = new Map(pairs);
      next.delete(i);
      report(next);
    }
    setActive(i);
  }
  function pickRight(j: number) {
    if (locked || active === null) return;
    const next = new Map([...pairs].filter(([, r]) => r !== j));
    next.set(active, j);
    setActive(null);
    report(next);
  }
  const leftOf = (j: number) => [...pairs].find(([, r]) => r === j)?.[0];
  const item = "flex-1 rounded-2xl border-2 px-4 py-3 text-xl font-bold transition";

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{hint}</p>
      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          {links.map((label, i) => (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => pickLeft(i)}
              style={pairs.has(i) ? { borderColor: PAIR_COLOURS[i % 6], background: `${PAIR_COLOURS[i % 6]}22` } : undefined}
              className={`${item} ${active === i ? "border-brand bg-brand-soft" : "border-line bg-card"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {rights.map((label, j) => {
            const owner = leftOf(j);
            return (
              <button
                key={j}
                type="button"
                disabled={locked}
                onClick={() => pickRight(j)}
                style={owner !== undefined ? { borderColor: PAIR_COLOURS[owner % 6], background: `${PAIR_COLOURS[owner % 6]}22` } : undefined}
                className={`${item} border-line bg-card`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
