"use client";

import type { HighlightMove, Highlights } from "@/lib/analysis/highlights";
import ClassificationIcon from "./ClassificationIcon";

interface HighlightsPanelProps {
  highlights: Highlights;
  onJumpToPly: (ply: number) => void;
}

function moveLabel(h: HighlightMove): string {
  return `${h.moveNumber}.${h.color === "b" ? ".." : ""} ${h.san}`;
}

function HighlightCard({
  h,
  accent,
  onJump,
}: {
  h: HighlightMove | null;
  accent: string;
  onJump: (ply: number) => void;
}) {
  if (!h) return null;
  return (
    <button
      onClick={() => onJump(h.ply)}
      className="flex w-full flex-col gap-1 rounded-lg bg-board-panel p-4 text-left transition hover:bg-board-panelLight"
    >
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold uppercase tracking-wide ${accent}`}>
          {h.label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {h.quality && <ClassificationIcon quality={h.quality} size={16} />}
        <span className="font-mono text-sm font-semibold text-neutral-100">
          {moveLabel(h)}
        </span>
      </div>
      <p className="text-xs text-neutral-400">{h.detail}</p>
    </button>
  );
}

function HighlightRow({
  h,
  onJump,
}: {
  h: HighlightMove;
  onJump: (ply: number) => void;
}) {
  return (
    <button
      onClick={() => onJump(h.ply)}
      className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left transition hover:bg-board-panelLight"
    >
      {h.quality ? (
        <ClassificationIcon quality={h.quality} size={15} className="mt-0.5 shrink-0" />
      ) : (
        <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full bg-neutral-600" />
      )}
      <span className="text-sm">
        <span className="font-mono font-semibold text-neutral-200">{moveLabel(h)}</span>{" "}
        <span className="text-neutral-400">— {h.detail}</span>
      </span>
    </button>
  );
}

/** "Match summary" — the headline moments of the game, all clickable. */
export default function HighlightsPanel({ highlights, onJumpToPly }: HighlightsPanelProps) {
  const { biggestBlunder, bestMove, turningPoint, missedOpportunities, tacticalSequences } =
    highlights;

  const nothing =
    !biggestBlunder &&
    !bestMove &&
    !turningPoint &&
    missedOpportunities.length === 0 &&
    tacticalSequences.length === 0;

  if (nothing) {
    return (
      <div className="rounded-lg bg-board-panel p-4 text-sm text-neutral-500">
        No standout moments — a steady, even game.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <HighlightCard h={bestMove} accent="text-classification-best" onJump={onJumpToPly} />
        <HighlightCard h={turningPoint} accent="text-classification-great" onJump={onJumpToPly} />
        <HighlightCard h={biggestBlunder} accent="text-classification-blunder" onJump={onJumpToPly} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-board-panel p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Missed opportunities
          </h3>
          {missedOpportunities.length === 0 ? (
            <p className="text-sm text-neutral-500">None — you converted your chances.</p>
          ) : (
            <div className="space-y-1">
              {missedOpportunities.map((h) => (
                <HighlightRow key={h.ply} h={h} onJump={onJumpToPly} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg bg-board-panel p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Tactical moments
          </h3>
          {tacticalSequences.length === 0 ? (
            <p className="text-sm text-neutral-500">No major tactics detected.</p>
          ) : (
            <div className="space-y-1">
              {tacticalSequences.map((h) => (
                <HighlightRow key={h.ply} h={h} onJump={onJumpToPly} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
