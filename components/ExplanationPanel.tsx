"use client";

import type { MoveExplanation } from "@/lib/analysis/explain";
import type { MoveClassification } from "@/lib/analysis/classify";
import { QUALITY_META } from "@/lib/analysis/quality";
import { THEME_META, type Theme } from "@/lib/analysis/themes";
import ClassificationIcon from "./ClassificationIcon";

interface ExplanationPanelProps {
  /** Explanation for the move that led to the current position, if flagged. */
  explanation?: MoveExplanation;
  classification?: MoveClassification;
  /** SAN of the move that led here, for context. */
  moveSan?: string;
  hasGame: boolean;
}

/**
 * Human-readable review of the current move: why it was bad, the better move,
 * the engine's line, and the tactical themes involved.
 */
export default function ExplanationPanel({
  explanation,
  classification,
  moveSan,
  hasGame,
}: ExplanationPanelProps) {
  const meta = classification ? QUALITY_META[classification.quality] : null;

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-board-panel p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Move Review
      </h2>

      {!hasGame && (
        <p className="text-sm text-neutral-500">
          Load a game to see move-by-move feedback.
        </p>
      )}

      {hasGame && !moveSan && (
        <p className="text-sm text-neutral-500">
          Step forward to review each move.
        </p>
      )}

      {hasGame && moveSan && !explanation && (
        <div className="flex items-center gap-2 text-sm">
          {classification && <ClassificationIcon quality={classification.quality} size={18} />}
          <span className="text-neutral-200">
            <span className="font-mono font-semibold">{moveSan}</span> —{" "}
            {meta ? `${meta.label.toLowerCase()} move. ${meta.blurb}` : "a solid move."}
          </span>
        </div>
      )}

      {explanation && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {classification && <ClassificationIcon quality={classification.quality} size={20} />}
            <p className={`text-sm font-semibold ${meta?.textClass ?? "text-neutral-100"}`}>
              {explanation.headline}
            </p>
          </div>
          <p className="text-sm text-neutral-300">{explanation.detail}</p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded bg-board-panelLight p-2">
              <div className="text-neutral-500">Eval swing</div>
              <div className="font-mono text-classification-blunder">
                −{explanation.evalSwing.toFixed(2)}
              </div>
            </div>
            <div className="rounded bg-board-panelLight p-2">
              <div className="text-neutral-500">Better move</div>
              <div className="font-mono text-classification-best">
                {explanation.bestMoveSan ?? "—"}
              </div>
            </div>
          </div>

          {explanation.pvSan.length > 0 && (
            <div className="text-xs text-neutral-400">
              <span className="text-neutral-500">Engine line:</span>{" "}
              <span className="font-mono">{explanation.pvSan.join(" ")}</span>
            </div>
          )}

          {explanation.themes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {[...new Set(explanation.themes)].map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-board-panelLight px-2 py-0.5 text-[11px] text-neutral-300"
                >
                  {THEME_META[t as Theme]?.label ?? t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
