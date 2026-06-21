"use client";

import type { EngineLine } from "@/lib/engine/types";
import { toEvalBar } from "@/lib/engine/evalBar";

interface EvalBarProps {
  line: EngineLine | undefined;
  /** Match the board orientation so the bar flips with it. */
  orientation: "white" | "black";
}

/**
 * Vertical evaluation bar. White's share fills from the White side of the
 * board; Black's share from the other end. Updates live as you navigate, with
 * a short transition so the fill animates between positions.
 */
export default function EvalBar({ line, orientation }: EvalBarProps) {
  const { whiteFraction, whiteAhead, label } = toEvalBar(line);

  // When the board shows White at the bottom, White's fill grows upward from
  // the bottom; when flipped, it grows downward from the top.
  const whiteAtBottom = orientation === "white";

  // Place the numeric label at the leading side's end of the bar.
  const labelAtBottom = whiteAtBottom ? whiteAhead : !whiteAhead;

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded bg-neutral-900"
      title={label ? `Evaluation: ${label}` : "Evaluating…"}
      aria-label={`Evaluation ${label}`}
    >
      {/* White's portion. */}
      <div
        className="absolute inset-x-0 bg-neutral-100 transition-[height] duration-200 ease-out"
        style={{
          height: `${whiteFraction * 100}%`,
          [whiteAtBottom ? "bottom" : "top"]: 0,
        }}
      />

      {/* Midline at 50% for reference. */}
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-neutral-500/40" />

      {/* Numeric label. */}
      {label && (
        <span
          className={`absolute inset-x-0 text-center text-[10px] font-bold tabular-nums ${
            labelAtBottom ? "bottom-1" : "top-1"
          } ${whiteAhead ? "text-neutral-900" : "text-neutral-100"}`}
        >
          {label}
        </span>
      )}
    </div>
  );
}
