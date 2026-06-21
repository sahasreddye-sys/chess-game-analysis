import { Chess } from "chess.js";
import type { Square, PieceSymbol } from "chess.js";
import type { ParsedGame, Ply } from "@/lib/types";
import type { EngineLine } from "@/lib/engine/types";
import type { MoveClassification } from "./classify";
import type { Theme } from "./themes";
import { VALUE, NAME, other, findHangingPiece } from "./see";

export interface MoveExplanation {
  ply: number;
  /** One-line, human-readable summary ("You hung your bishop on c4."). */
  headline: string;
  /** Supporting detail — what to do instead and why. */
  detail: string;
  themes: Theme[];
  bestMoveSan: string | null;
  /** Engine's preferred continuation in SAN, a few moves deep. */
  pvSan: string[];
  /** Centipawns lost, in pawns (e.g. 2.4). */
  evalSwing: number;
}

/** Detect whether the opponent's best reply forks two or more valuable units. */
function detectFork(
  fenAfter: string,
  moverColor: "w" | "b",
  oppBestUci: string | null
): { targets: PieceSymbol[]; check: boolean } | null {
  if (!oppBestUci) return null;
  const chess = new Chess(fenAfter);
  const opp = other(moverColor);

  let moved;
  try {
    moved = chess.move({
      from: oppBestUci.slice(0, 2) as Square,
      to: oppBestUci.slice(2, 4) as Square,
      promotion: (oppBestUci.slice(4, 5) || undefined) as PieceSymbol | undefined,
    });
  } catch {
    return null;
  }
  if (!moved) return null;

  const forkingSquare = moved.to as Square;
  const check = chess.isCheck();
  const targets: PieceSymbol[] = [];

  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== moverColor || cell.type === "k") continue;
      if (VALUE[cell.type] < 300) continue; // only minor pieces and up
      const attackedBy = chess.attackers(cell.square, opp);
      if (attackedBy.includes(forkingSquare)) targets.push(cell.type);
    }
  }

  if (targets.length + (check ? 1 : 0) >= 2) return { targets, check };
  return null;
}

/** Is the given line a forced mate against the mover? Returns mate distance. */
function mateAgainst(line: EngineLine | undefined, mover: "w" | "b"): number | null {
  if (!line || line.mate === null) return null;
  if ((mover === "w" && line.mate < 0) || (mover === "b" && line.mate > 0)) {
    return Math.abs(line.mate);
  }
  return null;
}

/** Did the mover have a forced mate available (in the before-position)? */
function mateFor(line: EngineLine | undefined, mover: "w" | "b"): number | null {
  if (!line || line.mate === null) return null;
  if ((mover === "w" && line.mate > 0) || (mover === "b" && line.mate < 0)) {
    return Math.abs(line.mate);
  }
  return null;
}

/** Convert a UCI move to SAN in the given position. */
function uciToSan(fen: string, uci: string): string | null {
  try {
    const c = new Chess(fen);
    const m = c.move({
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      promotion: (uci.slice(4, 5) || undefined) as PieceSymbol | undefined,
    });
    return m?.san ?? null;
  } catch {
    return null;
  }
}

/** Convert a UCI principal variation to SAN, up to `max` half-moves. */
function pvToSan(fen: string, pv: string[], max = 6): string[] {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const uci of pv.slice(0, max)) {
    try {
      const m = c.move({
        from: uci.slice(0, 2) as Square,
        to: uci.slice(2, 4) as Square,
        promotion: (uci.slice(4, 5) || undefined) as PieceSymbol | undefined,
      });
      if (!m) break;
      out.push(m.san);
    } catch {
      break;
    }
  }
  return out;
}

/**
 * True when the mover's king sits on its back rank and the three squares
 * directly in front of it are all occupied by its own pawns — i.e. the king
 * is genuinely boxed in, the precondition for a back-rank mate.
 */
function isBackRankTrap(fen: string, color: "w" | "b"): boolean {
  const chess = new Chess(fen);
  const king = findKing(fen, color);
  if (!king) return false;
  const backRank = color === "w" ? "1" : "8";
  if (king[1] !== backRank) return false;

  const file = king.charCodeAt(0);
  const frontRank = color === "w" ? "2" : "7";
  const files = [file - 1, file, file + 1].filter((f) => f >= 97 && f <= 104);
  // All in-front squares must be the king's own pawns (a real escape-less box).
  return files.every((f) => {
    const sq = (String.fromCharCode(f) + frontRank) as Square;
    const piece = chess.get(sq);
    return piece && piece.type === "p" && piece.color === color;
  });
}

/**
 * Explain why a single (already-flagged) move was bad. Combines engine
 * evaluation with static board analysis to produce a human-readable reason and
 * a set of tactical themes. Returns null for good moves.
 */
export function explainMove(
  ply: Ply,
  before: EngineLine | undefined,
  after: EngineLine | undefined,
  classification: MoveClassification
): MoveExplanation | null {
  // Only the three error grades get a "what went wrong" explanation. Good and
  // praiseworthy moves (best/excellent/good/brilliant/great), plus book and
  // forced moves, are not mistakes and need no critique here.
  if (classification.quality !== "inaccuracy" &&
      classification.quality !== "mistake" &&
      classification.quality !== "blunder") {
    return null;
  }

  const mover = ply.color;
  const themes: Theme[] = [];
  const bestMoveSan = before?.bestMove
    ? uciToSan(ply.fenBefore, before.bestMove)
    : null;
  const pvSan = before?.pv ? pvToSan(ply.fenBefore, before.pv) : [];
  const evalSwing = classification.cpLoss / 100;
  const better = bestMoveSan ? `The engine preferred ${bestMoveSan}.` : "";

  let headline = "";
  let detail = "";

  // 1) Walked into a forced mate.
  const allowedMate = mateAgainst(after, mover);
  const wasAlreadyMated = mateAgainst(before, mover);
  if (allowedMate !== null && wasAlreadyMated === null) {
    themes.push("mate-threat", "king-safety");
    // Tag a back-rank mate only when the king is trapped on its back rank by
    // its own pawns directly in front — the classic pattern. Otherwise the
    // king simply being on the back rank (e.g. a Scholar's-mate king on e8)
    // would be mislabeled.
    if (isBackRankTrap(ply.fenAfter, mover)) themes.push("back-rank");
    headline = `You allowed a forced mate (mate in ${allowedMate}).`;
    detail = `Your king came under a decisive attack. ${better} Look for the opponent's checks and threats before moving.`;
    return { ply: ply.index, headline, detail, themes, bestMoveSan, pvSan, evalSwing };
  }

  // 2) Missed a forced mate you had.
  const hadMate = mateFor(before, mover);
  const stillMate = mateFor(after, mover);
  if (hadMate !== null && stillMate === null) {
    themes.push("missed-mate");
    headline = `You missed a forced mate (mate in ${hadMate}).`;
    detail = `A forcing sequence led to checkmate. ${better} When the attack looks decisive, calculate it to the end.`;
    return { ply: ply.index, headline, detail, themes, bestMoveSan, pvSan, evalSwing };
  }

  // 3) Hung a piece.
  const hang = findHangingPiece(ply.fenAfter, mover);
  if (hang) {
    themes.push("hanging-piece", "material");
    const name = NAME[hang.piece];
    headline =
      hang.piece === "p"
        ? `You dropped a pawn on ${hang.square}.`
        : `You hung your ${name} on ${hang.square}.`;
    detail = `After ${ply.san}, your ${name} on ${hang.square} can be won. ${better}`;
    return { ply: ply.index, headline, detail, themes, bestMoveSan, pvSan, evalSwing };
  }

  // 4) Walked into a fork.
  const fork = detectFork(ply.fenAfter, mover, after?.bestMove ?? null);
  if (fork) {
    themes.push("fork", "material");
    const list = fork.targets.map((t) => NAME[t]);
    const what = fork.check ? ["your king", ...list].join(" and ") : list.join(" and ");
    headline = `You allowed a fork.`;
    detail = `The reply hits ${what} at once, winning material. ${better}`;
    return { ply: ply.index, headline, detail, themes, bestMoveSan, pvSan, evalSwing };
  }

  // 5) Generic material / positional drop.
  themes.push(evalSwing >= 2 ? "material" : "piece-activity");
  headline =
    classification.quality === "blunder"
      ? `Blunder — this loses about ${evalSwing.toFixed(1)} pawns of advantage.`
      : classification.quality === "mistake"
      ? `Mistake — this costs about ${evalSwing.toFixed(1)} pawns.`
      : `Inaccuracy — a more precise move was available.`;
  detail = `${better}${pvSan.length ? ` Best line: ${pvSan.join(" ")}.` : ""}`;
  return { ply: ply.index, headline, detail, themes, bestMoveSan, pvSan, evalSwing };
}

function findKing(fen: string, color: "w" | "b"): Square | null {
  const chess = new Chess(fen);
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.type === "k" && cell.color === color) return cell.square;
    }
  }
  return null;
}

/** Explain every flagged (inaccuracy / mistake / blunder) move in a game. */
export function explainGame(
  game: ParsedGame,
  results: Record<number, EngineLine>,
  classifications: Record<number, MoveClassification>
): Record<number, MoveExplanation> {
  const out: Record<number, MoveExplanation> = {};
  for (const ply of game.plies) {
    const cls = classifications[ply.index];
    if (!cls) continue;
    const explanation = explainMove(
      ply,
      results[ply.index - 1],
      results[ply.index],
      cls
    );
    if (explanation) out[ply.index] = explanation;
  }
  return out;
}
