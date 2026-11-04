"use client";

import { useState } from "react";
import type { PreviewGrade } from "@/lib/curriculum-preview";

type Labels = {
  grades: Record<string, string>;
  semester: string;
  lessonsFew: string;
  lessonsMany: string;
};

const UNIT_TONES = ["bg-brand", "bg-mint", "bg-sun", "bg-coral"];

// Arabic counts 3-10 take the plural ("دروس"), larger ones the singular accusative ("درسًا").
function lessonsLabel(n: number, labels: Labels) {
  return (n >= 3 && n <= 10 ? labels.lessonsFew : labels.lessonsMany).replace("{n}", String(n));
}

// Grade tabs over the real units and lessons of the official curriculum.
export function ProgramExplorer({ grades, labels }: { grades: PreviewGrade[]; labels: Labels }) {
  const [active, setActive] = useState(grades[0]?.nummer ?? 1);
  const grade = grades.find((g) => g.nummer === active) ?? grades[0];
  const total = grade.units.reduce((sum, unit) => sum + unit.topics.length, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div role="tablist" aria-label={labels.grades[String(active)]} className="flex gap-1 rounded-full border border-line bg-card p-1.5 shadow-sm">
          {grades.map((g) => (
            <button
              key={g.nummer}
              role="tab"
              type="button"
              id={`grade-tab-${g.nummer}`}
              aria-selected={g.nummer === active}
              aria-controls="grade-panel"
              onClick={() => setActive(g.nummer)}
              className="rounded-full px-5 py-2.5 text-sm font-extrabold text-muted transition hover:text-foreground aria-selected:bg-brand aria-selected:text-white aria-selected:shadow-md sm:px-6 sm:text-base"
            >
              {labels.grades[String(g.nummer)]}
            </button>
          ))}
        </div>
        <span className="rounded-full bg-mint-soft px-4 py-2 text-sm font-extrabold text-mint">{lessonsLabel(total, labels)}</span>
      </div>

      <div id="grade-panel" role="tabpanel" aria-labelledby={`grade-tab-${active}`} className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {grade.units.map((unit, i) => (
          <article key={unit.label} className="flex flex-col gap-4 rounded-3xl border border-line bg-card p-6 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-brand/10">
            <header className="flex items-start gap-3">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold text-white ${UNIT_TONES[i % UNIT_TONES.length]}`}>
                {i + 1}
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-muted">
                  {unit.label} · {labels.semester.replace("{n}", String(unit.semester))}
                </span>
                <h3 className="text-lg font-extrabold leading-snug">{unit.title}</h3>
              </div>
            </header>
            <ol className="flex flex-col gap-2 border-t border-line pt-4">
              {unit.topics.map((topic, j) => (
                // Two grade-2 lessons share a title in the curriculum, so the index is part of the key.
                <li key={`${j}-${topic}`} className="flex items-start gap-2 text-sm leading-relaxed text-foreground/85">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sun" />
                  {topic}
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </div>
  );
}
