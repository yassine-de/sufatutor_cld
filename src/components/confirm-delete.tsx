"use client";

import { useState } from "react";

type Props = {
  action: () => Promise<void>;
  labels: { delete: string; warning: string; confirm: string; cancel: string };
};

// Deleting is destructive, so it takes a second, explicit step.
export function ConfirmDelete({ action, labels }: Props) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="w-fit font-semibold text-red-700 underline dark:text-red-300">
        {labels.delete}
      </button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
      <p className="font-semibold text-red-900 dark:text-red-100">{labels.warning}</p>
      <div className="flex gap-3">
        <button type="submit" className="rounded-full bg-red-700 px-5 py-2 font-bold text-white">
          {labels.confirm}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="font-semibold underline">
          {labels.cancel}
        </button>
      </div>
    </form>
  );
}
