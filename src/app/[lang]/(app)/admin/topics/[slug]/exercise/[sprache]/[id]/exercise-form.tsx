"use client";

import { useActionState, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { saveExercise, type AdminState } from "../../../../../actions";

type Type = "multiple_choice" | "zahl_eingeben" | "zuordnen";

export type ExerciseInitial = {
  fragetyp: Type;
  frage: string;
  punkte: number;
  options: string[];
  correct: number;
  wert: string;
  einheit: string;
  pairs: { left: string; right: string }[];
};

type Props = {
  lang: string;
  topicId: string;
  sprache: "ar" | "fr";
  exerciseId: string | null;
  initial: ExerciseInitial;
  t: Dictionary["admin"];
};

const input = "w-full rounded-xl border border-line bg-card px-3 py-2";
const small = "text-sm font-semibold text-brand underline";

export function ExerciseForm({ lang, topicId, sprache, exerciseId, initial, t }: Props) {
  const [state, action, pending] = useActionState<AdminState, FormData>(saveExercise.bind(null, lang, topicId, sprache, exerciseId), undefined);
  const [type, setType] = useState<Type>(initial.fragetyp);
  const [options, setOptions] = useState(initial.options);
  const [correct, setCorrect] = useState(initial.correct);
  const [pairs, setPairs] = useState(initial.pairs);
  const dir = sprache === "ar" ? "rtl" : "ltr";   // the exercise is shown to the child in this language

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-semibold sm:col-span-2">
          {t.type}
          <select name="fragetyp" value={type} onChange={(e) => setType(e.target.value as Type)} className={input}>
            {(["multiple_choice", "zahl_eingeben", "zuordnen"] as const).map((k) => (
              <option key={k} value={k}>{t[k]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t.points}
          <input name="punkte" type="number" min={1} max={10} defaultValue={initial.punkte} className={input} />
        </label>
      </div>

      {type !== "zuordnen" && (
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t.question}
          <textarea name="frage" dir={dir} defaultValue={initial.frage} required rows={2} maxLength={500} className={input} />
        </label>
      )}

      {type === "multiple_choice" && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">{t.options} · {t.correctOption}</legend>
          {options.map((value, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="correct" value={i} checked={correct === i} onChange={() => setCorrect(i)} aria-label={`${t.correctOption} ${i + 1}`} />
              <input
                name="option"
                dir={dir}
                value={value}
                onChange={(e) => setOptions(options.map((o, j) => (j === i ? e.target.value : o)))}
                aria-label={`${t.option} ${i + 1}`}
                required
                maxLength={200}
                className={input}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  className={small}
                  onClick={() => {
                    setOptions(options.filter((_, j) => j !== i));
                    setCorrect(correct === i ? 0 : correct > i ? correct - 1 : correct);
                  }}
                >
                  {t.removeOption}
                </button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <button type="button" className={`${small} w-fit`} onClick={() => setOptions([...options, ""])}>
              + {t.addOption}
            </button>
          )}
        </fieldset>
      )}

      {type === "zahl_eingeben" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            {t.answerNumber}
            <input name="wert" inputMode="decimal" dir="ltr" defaultValue={initial.wert} required className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            {t.unit}
            <input name="einheit" dir={dir} defaultValue={initial.einheit} maxLength={20} className={input} />
          </label>
        </div>
      )}

      {type === "zuordnen" && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">{t.pairs}</legend>
          <p className="text-sm text-muted">{t.pairsHint}</p>
          {pairs.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                name="left"
                dir={dir}
                value={p.left}
                onChange={(e) => setPairs(pairs.map((x, j) => (j === i ? { ...x, left: e.target.value } : x)))}
                aria-label={`${t.leftItem} ${i + 1}`}
                required
                maxLength={100}
                className={input}
              />
              <span aria-hidden="true">↔</span>
              <input
                name="right"
                dir={dir}
                value={p.right}
                onChange={(e) => setPairs(pairs.map((x, j) => (j === i ? { ...x, right: e.target.value } : x)))}
                aria-label={`${t.rightItem} ${i + 1}`}
                required
                maxLength={100}
                className={input}
              />
              {pairs.length > 2 && (
                <button type="button" className={small} onClick={() => setPairs(pairs.filter((_, j) => j !== i))}>
                  {t.removeOption}
                </button>
              )}
            </div>
          ))}
          {pairs.length < 6 && (
            <button type="button" className={`${small} w-fit`} onClick={() => setPairs([...pairs, { left: "", right: "" }])}>
              + {t.addPair}
            </button>
          )}
        </fieldset>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-full bg-brand px-6 py-2.5 font-bold text-white disabled:opacity-60">
          {t.save}
        </button>
        {state?.error && <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-300">{t.error}</p>}
      </div>
    </form>
  );
}
