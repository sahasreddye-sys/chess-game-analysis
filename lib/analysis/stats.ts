import type { ParsedGame } from "@/lib/types";
import type { EngineLine } from "@/lib/engine/types";
import type { MoveClassification, MoveQuality } from "./classify";
import { perMoveAccuracies, blendAccuracy } from "./accuracy";
import { estimateElo } from "./elo";

export type Phase = "opening" | "middlegame" | "endgame";

export interface PhaseStat {
  moves: number;
  /** Mean accuracy in this phase, or null if no moves. */
  accuracy: number | null;
  /** Estimated Elo for this phase, or null if no moves. */
  elo: number | null;
}

export interface SideStats {
  color: "w" | "b";
  moveCount: number;
  /** Mean move accuracy, 0–100. */
  accuracy: number;
  /** Average centipawn loss. */
  acpl: number;
  inaccuracies: number;
  mistakes: number;
  blunders: number;
  bestMoves: number;
  bestMovePct: number;
  /** Estimated overall performance rating for this side. */
  estimatedElo: number | null;
  /** Count of every classification kind played by this side. */
  counts: Record<MoveQuality, number>;
  phase: Record<Phase, PhaseStat>;
}

export interface GameStats {
  white: SideStats;
  black: SideStats;
}

function emptyCounts(): Record<MoveQuality, number> {
  return {
    brilliant: 0,
    great: 0,
    best: 0,
    excellent: 0,
    good: 0,
    book: 0,
    forced: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };
}

/** Determine the game phase of a position from its FEN and move number. */
export function phaseOf(fen: string, moveNumber: number): Phase {
  const placement = fen.split(" ")[0];
  // Count major/minor pieces still on the board (both colors).
  const majorMinor = (placement.match(/[nbrqNBRQ]/g) ?? []).length;
  if (majorMinor <= 6) return "endgame";
  if (moveNumber <= 10) return "opening";
  return "middlegame";
}

/**
 * Volatility-weighted, harmonic-blended accuracy for one side, overall and per
 * phase. See `accuracy.ts` for why this is harsher (and more realistic) than a
 * plain mean of per-move accuracies.
 */
function sideAccuracy(
  game: ParsedGame,
  results: Record<number, EngineLine>,
  color: "w" | "b"
): { overall: number; phase: Record<Phase, { accuracy: number | null; moves: number }> } {
  const items = perMoveAccuracies(game, results, color);
  const byPhase: Record<Phase, { acc: number; weight: number }[]> = {
    opening: [],
    middlegame: [],
    endgame: [],
  };
  for (const it of items) {
    const ply = game.plies[it.ply - 1];
    byPhase[phaseOf(ply.fenBefore, ply.moveNumber)].push(it);
  }
  const phase = (p: Phase) => ({
    accuracy: blendAccuracy(byPhase[p]),
    moves: byPhase[p].length,
  });
  return {
    overall: blendAccuracy(items) ?? 0,
    phase: { opening: phase("opening"), middlegame: phase("middlegame"), endgame: phase("endgame") },
  };
}

/**
 * Compute per-side statistics for a game: accuracy, average centipawn loss,
 * classification counts, best-move rate, estimated Elo, and accuracy split by
 * game phase.
 */
export function computeStats(
  game: ParsedGame,
  results: Record<number, EngineLine>,
  classifications: Record<number, MoveClassification>
): GameStats {
  const acc = () => ({ sumLoss: 0, lossMoves: 0, moveCount: 0, counts: emptyCounts() });
  const agg = { w: acc(), b: acc() };

  for (const ply of game.plies) {
    const cls = classifications[ply.index];
    if (!cls) continue;
    const side = agg[ply.color];
    side.moveCount++;
    side.counts[cls.quality]++;
    side.sumLoss += cls.cpLoss;
    side.lossMoves++;
  }

  const finalize = (color: "w" | "b"): SideStats => {
    const s = agg[color];
    const acc = sideAccuracy(game, results, color);
    const phase = (p: Phase): PhaseStat => ({
      moves: acc.phase[p].moves,
      accuracy: acc.phase[p].accuracy,
      elo: estimateElo(acc.phase[p].accuracy),
    });
    const bestMoves = s.counts.brilliant + s.counts.great + s.counts.best;
    const hasAccuracy = s.moveCount > 0;
    return {
      color,
      moveCount: s.moveCount,
      accuracy: acc.overall,
      acpl: s.lossMoves ? s.sumLoss / s.lossMoves : 0,
      inaccuracies: s.counts.inaccuracy,
      mistakes: s.counts.mistake,
      blunders: s.counts.blunder,
      bestMoves,
      bestMovePct: s.moveCount ? (bestMoves / s.moveCount) * 100 : 0,
      estimatedElo: hasAccuracy ? estimateElo(acc.overall) : null,
      counts: s.counts,
      phase: {
        opening: phase("opening"),
        middlegame: phase("middlegame"),
        endgame: phase("endgame"),
      },
    };
  };

  return { white: finalize("w"), black: finalize("b") };
}
