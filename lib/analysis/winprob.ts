import type { EngineLine } from "@/lib/engine/types";

/**
 * Win-probability and accuracy model (Lichess-compatible).
 *
 * Centipawn evaluations are converted to a White win percentage via a logistic
 * curve, then per-move accuracy is derived from how much win% the mover gave
 * up. This matches the "Accuracy" numbers players are used to from Lichess /
 * Chess.com far better than a raw centipawn average would.
 */

const WIN_CP_CAP = 1000;

/** White's winning chances for a position, in [0, 100]. Mate-aware. */
export function winPercentWhite(line: EngineLine | undefined): number | null {
  if (!line) return null;
  if (line.mate !== null) return line.mate > 0 ? 100 : 0;
  if (line.scoreCp === null) return null;
  const cp = Math.max(-WIN_CP_CAP, Math.min(WIN_CP_CAP, line.scoreCp));
  // Lichess constant.
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}
