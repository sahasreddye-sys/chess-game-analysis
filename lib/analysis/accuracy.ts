import type { ParsedGame } from "@/lib/types";
import type { EngineLine } from "@/lib/engine/types";
import { winPercentWhite } from "./winprob";

/**
 * Game-accuracy model, following the Lichess approach (which Chess.com's
 * "Accuracy" closely tracks). A plain arithmetic mean of per-move accuracy is
 * far too lenient — it lets a sea of fine moves drown out a few bad ones. The
 * fix is two-fold:
 *
 *   1. Each move's accuracy is weighted by the *volatility* of the position
 *      (the std-dev of win% in a window around it), so errors made in sharp,
 *      decisive positions count for much more than ones in dead-drawn ones.
 *   2. The game score blends that weighted mean with the *harmonic* mean, which
 *      is dominated by the lowest values — so a couple of blunders genuinely
 *      drag the number down instead of being averaged away.
 */

// Per-move accuracy decay. Lichess uses 0.04354; we run a little steeper so the
// numbers track Chess.com's (harsher) "Accuracy" rather than reading generously.
const DECAY = 0.061;

/** Accuracy (0–100) of one move from how much win% the mover gave up. */
export function moveAccuracy(winBeforeMover: number, winAfterMover: number): number {
  const drop = Math.max(0, winBeforeMover - winAfterMover);
  const acc = 103.1668 * Math.exp(-DECAY * drop) - 3.1669;
  return Math.max(0, Math.min(100, acc));
}

export interface MoveAccuracy {
  ply: number;
  acc: number;
  weight: number;
}

/** Per-move accuracy and volatility weight for every move played by `side`. */
export function perMoveAccuracies(
  game: ParsedGame,
  results: Record<number, EngineLine>,
  side: "w" | "b"
): MoveAccuracy[] {
  const wins = game.positions.map((_, i) => winPercentWhite(results[i]));
  const windowSize = Math.max(2, Math.min(8, Math.round(game.plies.length / 10)));

  const items: MoveAccuracy[] = [];
  for (const ply of game.plies) {
    if (ply.color !== side) continue;
    const before = wins[ply.index - 1];
    const after = wins[ply.index];
    if (before == null || after == null) continue;
    const mBefore = side === "w" ? before : 100 - before;
    const mAfter = side === "w" ? after : 100 - after;
    items.push({
      ply: ply.index,
      acc: moveAccuracy(mBefore, mAfter),
      weight: volatilityWeight(wins, ply.index, windowSize),
    });
  }
  return items;
}

/** Std-dev of win% in a window around a position, clamped to a sane range. */
function volatilityWeight(
  wins: (number | null)[],
  index: number,
  windowSize: number
): number {
  const lo = Math.max(0, index - windowSize);
  const hi = Math.min(wins.length - 1, index + windowSize);
  const sample: number[] = [];
  for (let k = lo; k <= hi; k++) {
    const v = wins[k];
    if (v != null) sample.push(v);
  }
  if (sample.length < 2) return 1;
  const mean = sample.reduce((a, b) => a + b, 0) / sample.length;
  const variance = sample.reduce((a, b) => a + (b - mean) ** 2, 0) / sample.length;
  return Math.max(0.5, Math.min(12, Math.sqrt(variance)));
}

/**
 * Blend the volatility-weighted mean with the harmonic mean (0–100). We lean on
 * the harmonic mean (2:1) because it is dominated by the worst moves, so a few
 * real errors pull the score down the way Chess.com's does — instead of being
 * averaged away by a long tail of fine moves.
 */
export function blendAccuracy(items: { acc: number; weight: number }[]): number | null {
  if (items.length === 0) return null;
  const wSum = items.reduce((s, x) => s + x.weight, 0) || 1;
  const weighted = items.reduce((s, x) => s + x.acc * x.weight, 0) / wSum;
  const harmonic =
    items.length / items.reduce((s, x) => s + 1 / Math.max(1, x.acc), 0);
  return Math.max(0, Math.min(100, (weighted + 2 * harmonic) / 3));
}
