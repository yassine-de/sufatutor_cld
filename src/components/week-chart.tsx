import type { DayStats } from "@/lib/dashboard";
import { toMinutes, weekdayLabel } from "@/lib/dashboard";
import type { Locale } from "@/i18n/config";

type Labels = { title: string; table: string; day: string; minutes: string; topics: string; min: string };

// Learning minutes per day for the last 7 days. One series in the brand colour, so no legend:
// the heading names it. Values sit on the bars that have data, every bar has a tooltip
// (title) and the same numbers are available as a table for screen readers.
export function WeekChart({ days, lang, labels }: { days: DayStats[]; lang: Locale; labels: Labels }) {
  const minutes = days.map((d) => toMinutes(d.learningSeconds));
  const max = Math.max(10, ...minutes); // keeps a day with 2 minutes from looking like a full day
  const text = (n: number) => labels.min.replace("{n}", String(n));

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="font-bold">{labels.title}</figcaption>
      <div className="relative flex h-40 items-end gap-2 border-b border-line" aria-hidden="true">
        {/* recessive guide at half height */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-line" />
        {days.map((d, i) => (
          <div key={d.day} title={`${weekdayLabel(d.day, lang)}: ${text(minutes[i])}`} className="relative flex h-full flex-1 flex-col items-center justify-end">
            {minutes[i] > 0 && <span className="mb-1 text-xs font-semibold">{minutes[i]}</span>}
            <div
              className="w-full max-w-10 rounded-t-[4px] bg-brand"
              style={{ height: `${(minutes[i] / max) * 100}%`, minHeight: minutes[i] > 0 ? 4 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 text-center text-xs text-muted" aria-hidden="true">
        {days.map((d) => (
          <span key={d.day} className="flex-1">
            {weekdayLabel(d.day, lang)}
          </span>
        ))}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold text-brand">{labels.table}</summary>
        <table className="mt-2 w-full text-start">
          <thead>
            <tr className="text-muted">
              <th className="py-1 text-start font-semibold">{labels.day}</th>
              <th className="py-1 text-start font-semibold">{labels.minutes}</th>
              <th className="py-1 text-start font-semibold">{labels.topics}</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d, i) => (
              <tr key={d.day} className="border-t border-line">
                <td className="py-1">{weekdayLabel(d.day, lang)}</td>
                <td className="py-1">{minutes[i]}</td>
                <td className="py-1">{d.topicsCompleted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
