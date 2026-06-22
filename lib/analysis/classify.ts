import { Chess } from "chess.js";
import type { ParsedGame, Ply } from "@/lib/types";
import type { EngineLine } from "@/lib/engine/types";
import { matchOpening } from "@/lib/openings/book";
import { findHangingPiece } from "./see";

/**
 * Centipawn equivalent assigned to a forced mate, minus the mate distance so a
 * shorter mate ranks above a longer one. Large enough that any mate dominates a
 * normal centipawn score.
 */
const MATE_CP = 100_000;

/**
 * Per-move centipawn loss is capped before classification/averaging. A single
 * catastrophic move (e.g. walking into mate) would otherwise be worth thousands
 * of centipawns and wreck later average-CPL statistics. 1000cp (10 pawns) is
 * already firmly "blunder" territory, so capping doesn't change the label.
 */
export const CP_LOSS_CAP = 1000;

export type MoveQuality =
  | "brilliant"
  | "great"
  | "best"
  | "excellent"
  | "good"
  | "book"
  | "forced"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export interface MoveClassification {
  /** Ply index this classification applies to. */
  ply: number;
  quality: MoveQuality;
  /** Centipawns lost vs. the engine's best move, from the mover's POV (>= 0). */
  cpLoss: number;
  /** True when the played move was the engine's top choice. */
  playedBest: boolean;
  /** Engine best move (UCI) in the position before this move. */
  bestMoveUci: string | null;
}

/** Convert an engine line to a White-POV centipawn number (mate-aware). */
function lineToWhiteCp(line: EngineLine | undefined): number | null {
  if (!line) return null;
  if (line.mate !== null) {
    const sign = line.mate > 0 ? 1 : -1;
    return sign * (MATE_CP - Math.abs(line.mate));
  }
  return line.scoreCp; // may be null for a not-yet-scored position
}

/** White-POV centipawn number for the engine's *second* line (MultiPV 2). */
function secondToWhiteCp(line: EngineLine | undefined): number | null {
  if (!line) return null;
  if (line.secondMate != null) {
    const sign = line.secondMate > 0 ? 1 : -1;
    return sign * (MATE_CP - Math.abs(line.secondMate));
  }
  return line.secondCp ?? null;
}

/**
 * Bucket a centipawn loss into a base quality label.
 *   Best       top move, or cpLoss < 10
 *   Excellent  11–25
 *   Good       26–50
 *   Inaccuracy 51–100
 *   Mistake    101–200
 *   Blunder    > 200
 */
function baseQualityFor(cpLoss: number, playedBest: boolean): MoveQuality {
  if (playedBest || cpLoss < 10) return "best";
  if (cpLoss <= 25) return "excellent";
  if (cpLoss <= 50) return "good";
  if (cpLoss <= 100) return "inaccuracy";
  if (cpLoss <= 200) return "mistake";
  return "blunder";
}

/** Number of legal moves in a position (1 ⇒ the move was forced). */
function legalMoveCount(fen: string): number {
  try {
    return new Chess(fen).moves().length;
  } catch {
    return 99;
  }
}

/**
 * Is this move a genuine brilliancy? True only when it is (essentially) the
 * engine's own move, leaves one of the mover's pieces (≥ a knight) en prise,
 * the sacrifice is sound (still at least equal afterwards), and the mover
 * wasn't already completely winning — so a "sac" there is just simplification,
 * not a find. Kept strict to avoid the false positives Chess.com doesn't give.
 */
function isBrilliant(
  ply: Ply,
  moverBefore: number,
  moverAfter: number,
  cpLoss: number
): boolean {
  if (cpLoss > 10) return false; // must be (essentially) the engine's choice
  if (moverAfter < 0) return false; // the sacrifice must be sound
  if (moverBefore > 450) return false; // not just cashing in while crushing
  const hang = findHangingPiece(ply.fenAfter, ply.color);
  return !!hang && hang.loss >= 200;
}

/**
 * Classify a single move given the engine lines before/after it and a few flags
 * derived from the position. Returns null if either eval is missing.
 */
export function classifyMove(
  ply: Ply,
  before: EngineLine | undefined,
  after: EngineLine | undefined,
  isBook: boolean
): MoveClassification | null {
  const beforeCp = lineToWhiteCp(before);
  const afterCp = lineToWhiteCp(after);
  if (beforeCp === null || afterCp === null) return null;

  const playedUci = ply.from + ply.to + (ply.promotion ?? "");
  const bestMoveUci = before?.bestMove ?? null;
  const playedBest = bestMoveUci !== null && bestMoveUci === playedUci;

  // Flip to mover POV so a larger number is always better for the mover.
  const sign = ply.color === "w" ? 1 : -1;
  const moverBefore = sign * beforeCp;
  const moverAfter = sign * afterCp;
  const rawLoss = Math.max(0, moverBefore - moverAfter);

  // If you played the engine's #1 move, any apparent "loss" is just a
  // search-horizon artifact (the after-position is searched from a different
  // root) — you played optimally, so the loss is zero. This also keeps best
  // moves out of the ACPL average.
  const cpLoss = playedBest ? 0 : Math.min(CP_LOSS_CAP, rawLoss);

  const base = { ply: ply.index, cpLoss, playedBest, bestMoveUci };

  // 1) Opening theory.
  if (isBook) return { ...base, quality: "book" };

  // 2) Only legal move available.
  if (legalMoveCount(ply.fenBefore) <= 1) return { ...base, quality: "forced" };

  // 3) Sound sacrifice → Brilliant.
  if (isBrilliant(ply, moverBefore, moverAfter, cpLoss)) {
    return { ...base, quality: "brilliant" };
  }

  // 4) Only good move (big gap to the second-best) → Great. This is a genuine
  //    "find": the engine's top move, which truly holds the eval (small raw
  //    loss — so it isn't just a forced recapture in a lost position), with the
  //    next-best move much worse, in a roughly balanced position.
  const secondWhite = secondToWhiteCp(before);
  if (playedBest && secondWhite !== null && rawLoss <= 25) {
    const moverSecond = sign * secondWhite;
    const gap = moverBefore - moverSecond;
    if (gap >= 200 && moverBefore <= 200 && moverBefore >= -120) {
      return { ...base, quality: "great" };
    }
  }

  // 5) Otherwise bucket by centipawn loss.
  return { ...base, quality: baseQualityFor(cpLoss, playedBest) };
}

/** Classify every move in the game for which both surrounding evals exist. */
export function classifyGame(
  game: ParsedGame,
  results: Record<number, EngineLine>
): Record<number, MoveClassification> {
  const out: Record<number, MoveClassification> = {};

  // How deep the game stayed in book.
  const sans = game.plies.map((p) => p.san);
  const opening = matchOpening(sans);
  const bookPlies = opening?.bookPlies ?? 0;

  for (const ply of game.plies) {
    // A checkmating move ('#') ends the game, so the resulting position is
    // terminal and can't be scored by the engine. It's best by definition.
    if (ply.san.endsWith("#")) {
      out[ply.index] = {
        ply: ply.index,
        quality: "best",
        cpLoss: 0,
        playedBest: true,
        bestMoveUci: results[ply.index - 1]?.bestMove ?? null,
      };
      continue;
    }

    const classification = classifyMove(
      ply,
      results[ply.index - 1],
      results[ply.index],
      ply.index <= bookPlies
    );
    if (classification) out[ply.index] = classification;
  }
  return out;
}
