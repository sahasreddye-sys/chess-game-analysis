"use client";

import { useState } from "react";
import type { CoachReport } from "@/lib/analysis/coach";

interface CoachPanelProps {
  report: CoachReport;
  onJumpToPly: (ply: number) => void;
}

/**
 * The "Coach" — a friendly, fully local summary of the game with prioritised
 * takeaways and a set of pre-answered questions. Answers that reference a
 * specific move can jump the board to it.
 */
export default function CoachPanel({ report, onJumpToPly }: CoachPanelProps) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg bg-board-panel p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-classification-great text-xs font-bold text-white">
            C
          </span>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
            Coach&apos;s summary
          </h3>
        </div>
        <p className="text-sm leading-relaxed text-neutral-200">{report.narrative}</p>
      </div>

      <div className="rounded-lg bg-board-panel p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Key takeaways
        </h3>
        <ul className="space-y-2">
          {report.takeaways.map((t, i) => (
            <li key={i} className="flex gap-2 text-sm text-neutral-200">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-classification-great" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg bg-board-panel p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Ask the coach
        </h3>
        <div className="divide-y divide-neutral-800">
          {report.qa.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="py-1">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-2 py-1.5 text-left text-sm font-medium text-neutral-100"
                >
                  <span>{item.q}</span>
                  <span className="text-neutral-500">{isOpen ? "–" : "+"}</span>
                </button>
                {isOpen && (
                  <div className="pb-2 text-sm text-neutral-300">
                    <p>{item.a}</p>
                    {item.ply !== undefined && (
                      <button
                        onClick={() => onJumpToPly(item.ply!)}
                        className="mt-1 text-xs font-medium text-classification-great hover:underline"
                      >
                        Show this move on the board →
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
