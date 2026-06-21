import { Chess } from "chess.js";
import type { Square, PieceSymbol } from "chess.js";

/** Centipawn value of each piece, used for material and exchange evaluation. */
export const VALUE: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 100000,
};

/** Plain-English piece names. */
export const NAME: Record<PieceSymbol, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

export const other = (c: "w" | "b"): "w" | "b" => (c === "w" ? "b" : "w");

/**
 * Static exchange evaluation on one square: the material (in centipawns) the
 * side `by` wins by initiating a sequence of captures there, assuming both
 * sides always recapture with their cheapest available piece and stop when
 * continuing is unfavourable. > 0 means the occupant is effectively hanging.
 */
export function staticExchange(
  chess: Chess,
  square: Square,
  by: "w" | "b"
): number {
  const piece = chess.get(square);
  if (!piece || piece.color === by) return 0;

  const attackerSqs = chess.attackers(square, by);
  if (attackerSqs.length === 0) return 0;
  const defenderSqs = chess.attackers(square, other(by));

  const atk = attackerSqs
    .map((s) => VALUE[chess.get(s)!.type])
    .sort((a, b) => a - b);
  const def = defenderSqs
    .map((s) => VALUE[chess.get(s)!.type])
    .sort((a, b) => a - b);

  // Ordered list of piece values captured during the swap-off.
  const captured = [VALUE[piece.type]];
  let standing = atk[0];
  let ai = 1;
  let di = 0;
  let defenderToMove = true;
  while (
    (defenderToMove && di < def.length) ||
    (!defenderToMove && ai < atk.length)
  ) {
    captured.push(standing);
    standing = defenderToMove ? def[di++] : atk[ai++];
    defenderToMove = !defenderToMove;
  }

  // Negamax the swap list: each side may stop capturing when it's unfavourable.
  let value = 0;
  for (let k = captured.length - 1; k >= 1; k--) {
    value = Math.max(0, captured[k] - value);
  }
  return captured[0] - value;
}

/** Find the mover's most valuable piece that is hanging after their move. */
export function findHangingPiece(
  fenAfter: string,
  moverColor: "w" | "b"
): { square: Square; piece: PieceSymbol; loss: number } | null {
  const chess = new Chess(fenAfter);
  const opp = other(moverColor);
  let worst: { square: Square; piece: PieceSymbol; loss: number } | null = null;

  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== moverColor || cell.type === "k") continue;
      const loss = staticExchange(chess, cell.square, opp);
      if (loss >= 150 && (!worst || loss > worst.loss)) {
        worst = { square: cell.square, piece: cell.type, loss };
      }
    }
  }
  return worst;
}

/** Total material on the board for one colour, in centipawns (kings excluded). */
export function materialFor(fen: string, color: "w" | "b"): number {
  const chess = new Chess(fen);
  let total = 0;
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.color === color && cell.type !== "k") {
        total += VALUE[cell.type];
      }
    }
  }
  return total;
}
