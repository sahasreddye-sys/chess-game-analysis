import type { EngineLine } from "./types";

/** Visual cap: evaluations beyond ±5.00 pawns all render as a full bar. */
export const EVAL_CAP_CP = 500;

export interface EvalBarModel {
  /**
   * Fraction of the bar occupied by White, in [0, 1].
   * 0.5 = equal, 1 = White completely winning, 0 = Black completely winning.
   */
  whiteFraction: number;
  /** Whether White is (at least nominally) ahead — drives label placement. */
  whiteAhead: boolean;
  /** Short magnitude label shown on the bar: "1.4", "M5", or "" when unknown. */
  label: string;
}

/**
 * Convert a White-POV engine line into the data the eval bar needs.
 *
 * Centipawn scores are clamped to ±EVAL_CAP_CP and mapped linearly onto the
 * bar. Mate is treated as a fully won/lost bar (the numeric label still shows
 * the mate distance).
 */
export function toEvalBar(line: EngineLine | undefined): EvalBarModel {
  if (!line) {
    return { whiteFraction: 0.5, whiteAhead: true, label: "" };
  }

  if (line.mate !== null) {
    // mate > 0: White mates. mate === 0 shouldn't occur, treat as White.
    const whiteMates = line.mate > 0;
    return {
      whiteFraction: whiteMates ? 1 : 0,
      whiteAhead: whiteMates,
      label: `M${Math.abs(line.mate)}`,
    };
  }

  if (line.scoreCp === null) {
    return { whiteFraction: 0.5, whiteAhead: true, label: "" };
  }

  const clamped = Math.max(-EVAL_CAP_CP, Math.min(EVAL_CAP_CP, line.scoreCp));
  const whiteFraction = 0.5 + clamped / (2 * EVAL_CAP_CP);

  return {
    whiteFraction,
    whiteAhead: line.scoreCp >= 0,
    label: (Math.abs(line.scoreCp) / 100).toFixed(1),
  };
}
