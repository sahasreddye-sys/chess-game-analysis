/**
 * Engine-facing types. Kept separate from the game/domain types so the engine
 * layer can evolve independently.
 */

export type EngineStatus =
  | "uninitialized"
  | "loading"
  | "ready"
  | "analyzing"
  | "error";

/**
 * A single evaluated position. Scores are always expressed from **White's
 * point of view**: positive = good for White, negative = good for Black. This
 * is the convention the eval bar (Phase 3) and classification (Phase 4) rely
 * on, regardless of whose turn it is in the FEN.
 */
export interface EngineLine {
  /** Search depth reached (plies). */
  depth: number;
  /**
   * Evaluation in centipawns, White POV. Null when the position is a forced
   * mate (see `mate`).
   */
  scoreCp: number | null;
  /**
   * Forced mate distance, White POV. Positive = White mates in N, negative =
   * Black mates in N. Null when there's no forced mate.
   */
  mate: number | null;
  /** Best move in UCI long algebraic, e.g. "e2e4", "e7e8q". Null if none. */
  bestMove: string | null;
  /** Principal variation as UCI moves. */
  pv: string[];
  /**
   * Second-best move's centipawn score, White POV (from MultiPV=2). Null when
   * there is no distinct second line (e.g. only one legal move, or mate). Used
   * to detect "only good move" situations (the Great classification).
   */
  secondCp?: number | null;
  /** Second-best move's forced-mate distance, White POV. */
  secondMate?: number | null;
  /** Second-best move in UCI, if any. */
  secondMove?: string | null;
}

/** A request to evaluate one position. */
export interface AnalysisRequest {
  fen: string;
  depth: number;
}
