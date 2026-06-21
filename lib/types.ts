/**
 * Shared domain types.
 *
 * These are intentionally engine-agnostic. Phase 2+ will introduce a parallel
 * `Analysis` type keyed by ply index; the `Ply` model below is the spine that
 * everything else hangs off of.
 */

export type Color = "w" | "b";

/** A single half-move (ply) together with the positions surrounding it. */
export interface Ply {
  /** 1-based index of this ply within the game (1 = first half-move). */
  index: number;
  /** Full-move number as shown to a human (1, 1, 2, 2, 3, 3, ...). */
  moveNumber: number;
  /** Side that made the move. */
  color: Color;
  /** Standard Algebraic Notation, e.g. "Nf3", "O-O", "exd5". */
  san: string;
  /** Origin square, e.g. "g1". */
  from: string;
  /** Destination square, e.g. "f3". */
  to: string;
  /** Promotion piece if any ("q", "r", "b", "n"). */
  promotion?: string;
  /** FEN of the position *before* this move was played. */
  fenBefore: string;
  /** FEN of the position *after* this move was played. */
  fenAfter: string;
}

/** The result of parsing a PGN string. */
export interface ParsedGame {
  /** PGN tag pairs (Event, White, Black, Result, etc.). */
  headers: Record<string, string>;
  /**
   * FEN for every position in the game, where positions[0] is the starting
   * position and positions[i] is the position after ply i.
   * Length === plies.length + 1.
   */
  positions: string[];
  /** Ordered list of half-moves. */
  plies: Ply[];
}
