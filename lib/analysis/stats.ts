import type { ParsedGame } from "@/lib/types";
import type { EngineLine } from "@/lib/engine/types";
import type { MoveClassification, MoveQuality } from "./classify";
import { accuracyForMove } from "./winprob";
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

function emptyPhases(): Record<Phase, { sumAcc: number; moves: number }> {
  return {
    opening: { sumAcc: 0, moves: 0 },
    middlegame: { sumAcc: 0, moves: 0 },
    endgame: { sumAcc: 0, moves: 0 },
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
  const acc = () => ({
    sumAcc: 0,
    accMoves: 0,
    sumLoss: 0,
    lossMoves: 0,
    moveCount: 0,
    counts: emptyCounts(),
    phases: emptyPhases(),
  });

  const agg = { w: acc(), b: acc() };

  for (const ply of game.plies) {
    const cls = classifications[ply.index];
    if (!cls) continue;
    const side = agg[ply.color];
    side.moveCount++;
    side.counts[cls.quality]++;

    side.sumLoss += cls.cpLoss;
    side.lossMoves++;

    const a = accuracyForMove(
      results[ply.index - 1],
      results[ply.index],
      ply.color
    );
    if (a !== null) {
      side.sumAcc += a;
      side.accMoves++;
      const phase = phaseOf(ply.fenBefore, ply.moveNumber);
      side.phases[phase].sumAcc += a;
      side.phases[phase].moves++;
    }
  }

  const finalize = (color: "w" | "b"): SideStats => {
    const s = agg[color];
    const phase = (p: Phase): PhaseStat => {
      const accuracy = s.phases[p].moves ? s.phases[p].sumAcc / s.phases[p].moves : null;
      return { moves: s.phases[p].moves, accuracy, elo: estimateElo(accuracy) };
    };
    const accuracy = s.accMoves ? s.sumAcc / s.accMoves : 0;
    const bestMoves = s.counts.brilliant + s.counts.great + s.counts.best;
    return {
      color,
      moveCount: s.moveCount,
      accuracy,
      acpl: s.lossMoves ? s.sumLoss / s.lossMoves : 0,
      inaccuracies: s.counts.inaccuracy,
      mistakes: s.counts.mistake,
      blunders: s.counts.blunder,
      bestMoves,
      bestMovePct: s.moveCount ? (bestMoves / s.moveCount) * 100 : 0,
      estimatedElo: s.accMoves ? estimateElo(accuracy) : null,
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
