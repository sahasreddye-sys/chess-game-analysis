"use client";

import { useEffect, useRef } from "react";
import type { Ply } from "@/lib/types";
import type { MoveClassification, MoveQuality } from "@/lib/analysis/classify";
import type { MoveExplanation } from "@/lib/analysis/explain";
import { QUALITY_META } from "@/lib/analysis/quality";
import ClassificationIcon from "./ClassificationIcon";

interface MoveListProps {
  plies: Ply[];
  /** Current ply index (0 = start, N = after ply N). */
  currentPly: number;
  onSelect: (ply: number) => void;
  /** Move classifications keyed by ply index. */
  classifications: Record<number, MoveClassification>;
  /** Per-move explanations, for richer hover tooltips. */
  explanations: Record<number, MoveExplanation>;
}

// Qualities that get an inline icon (the rest are just colour-coded text).
const ICONIZED: MoveQuality[] = [
  "brilliant",
  "great",
  "book",
  "forced",
  "inaccuracy",
  "mistake",
  "blunder",
];

/**
 * Scrollable two-column move list (White | Black). Each move is colored by its
 * classification, notable moves carry an icon, and hovering shows why the move
 * earned its label.
 */
export default function MoveList({
  plies,
  currentPly,
  onSelect,
  classifications,
  explanations,
}: MoveListProps) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentPly]);

  const rows: { moveNumber: number; white?: Ply; black?: Ply }[] = [];
  for (const ply of plies) {
    if (ply.color === "w") {
      rows.push({ moveNumber: ply.moveNumber, white: ply });
    } else {
      const last = rows[rows.length - 1];
      if (last && last.moveNumber === ply.moveNumber) last.black = ply;
      else rows.push({ moveNumber: ply.moveNumber, black: ply });
    }
  }

  return (
    <div className="flex h-full flex-col rounded-lg bg-board-panel">
      <h2 className="border-b border-neutral-700 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Moves
      </h2>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-2 py-2">
        {plies.length === 0 ? (
          <p className="px-2 py-4 text-sm text-neutral-500">No game loaded yet.</p>
        ) : (
          <ol className="text-sm">
            {rows.map((row) => (
              <li
                key={row.moveNumber}
                className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-1 rounded px-1 py-0.5"
              >
                <span className="text-right text-neutral-500">{row.moveNumber}.</span>
                <MoveCell
                  ply={row.white}
                  currentPly={currentPly}
                  onSelect={onSelect}
                  activeRef={activeRef}
                  classification={row.white && classifications[row.white.index]}
                  explanation={row.white && explanations[row.white.index]}
                />
                <MoveCell
                  ply={row.black}
                  currentPly={currentPly}
                  onSelect={onSelect}
                  activeRef={activeRef}
                  classification={row.black && classifications[row.black.index]}
                  explanation={row.black && explanations[row.black.index]}
                />
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function tooltipFor(
  classification: MoveClassification,
  explanation?: MoveExplanation | null
): string {
  const meta = QUALITY_META[classification.quality];
  const loss = classification.cpLoss > 0 ? ` (−${(classification.cpLoss / 100).toFixed(2)})` : "";
  const reason = explanation?.headline ?? meta.blurb;
  return `${meta.label}${loss} — ${reason}`;
}

function MoveCell({
  ply,
  currentPly,
  onSelect,
  activeRef,
  classification,
  explanation,
}: {
  ply?: Ply;
  currentPly: number;
  onSelect: (ply: number) => void;
  activeRef: React.MutableRefObject<HTMLButtonElement | null>;
  classification?: MoveClassification | null;
  explanation?: MoveExplanation | null;
}) {
  if (!ply) return <span />;
  const isActive = ply.index === currentPly;
  const meta = classification ? QUALITY_META[classification.quality] : null;
  const showIcon = classification && ICONIZED.includes(classification.quality);

  return (
    <button
      ref={isActive ? activeRef : undefined}
      onClick={() => onSelect(ply.index)}
      title={classification ? tooltipFor(classification, explanation) : undefined}
      className={`flex items-center gap-1.5 rounded px-2 py-1 text-left font-medium transition ${
        isActive ? "bg-board-panelLight ring-1 ring-neutral-500" : "hover:bg-board-panelLight"
      } ${meta ? meta.textClass : "text-neutral-200"}`}
    >
      <span>{ply.san}</span>
      {showIcon && classification && (
        <ClassificationIcon quality={classification.quality} size={14} className="shrink-0" />
      )}
    </button>
  );
}
