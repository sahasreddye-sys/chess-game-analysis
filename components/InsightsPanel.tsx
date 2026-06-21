"use client";

import type { SideInsights } from "@/lib/analysis/insights";

interface InsightsPanelProps {
  insights: SideInsights;
  onJumpToPly?: (ply: number) => void;
}

/** Strengths, weaknesses, recommendations and turning points for the user. */
export default function InsightsPanel({ insights, onJumpToPly }: InsightsPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Why did the game go this way */}
      <div className="rounded-lg bg-board-panel p-4">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          {insights.resultText}
        </h3>
        <p className="text-sm text-neutral-200">{insights.summary}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Strengths */}
        <div className="rounded-lg bg-board-panel p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-classification-best">
            Top strengths
          </h3>
          <ul className="space-y-2">
            {insights.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-classification-best" />
                <span>
                  <span className="font-medium text-neutral-100">{s.title}</span>
                  <p className="text-xs text-neutral-400">{s.detail}</p>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="rounded-lg bg-board-panel p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-classification-blunder">
            Top weaknesses
          </h3>
          <ul className="space-y-2">
            {insights.weaknesses.map((w, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-classification-blunder" />
                <span>
                  <span className="font-medium text-neutral-100">{w.title}</span>
                  <p className="text-xs text-neutral-400">{w.detail}</p>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Turning points */}
      {insights.turningPoints.length > 0 && (
        <div className="rounded-lg bg-board-panel p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Turning points
          </h3>
          <ul className="space-y-1.5">
            {insights.turningPoints.map((t) => (
              <li key={t.ply}>
                <button
                  onClick={() => onJumpToPly?.(t.ply)}
                  className="w-full rounded px-2 py-1 text-left text-sm transition hover:bg-board-panelLight"
                >
                  <span className="font-mono text-neutral-300">
                    {t.moveNumber}.{t.color === "b" ? ".." : ""} {t.san}
                  </span>{" "}
                  <span className="text-neutral-400">— {t.headline}</span>
                  <span className="ml-1 font-mono text-xs text-classification-blunder">
                    (−{t.swing.toFixed(1)})
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-board-panel p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            What to study next
          </h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-neutral-300">
            {insights.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          {insights.puzzleThemes.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500">
                Suggested puzzle themes
              </div>
              <div className="flex flex-wrap gap-1.5">
                {insights.puzzleThemes.map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-board-panelLight px-2 py-0.5 text-xs text-neutral-200"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-board-panel p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Opening improvement
          </h3>
          <p className="text-sm text-neutral-300">{insights.openingSuggestion}</p>
        </div>
      </div>
    </div>
  );
}
