import type { ParsedGame } from "@/lib/types";
import type { EngineLine } from "@/lib/engine/types";
import type { MoveClassification } from "./classify";

/** [from, to, color] — matches react-chessboard's customArrows shape. */
export type BoardArrow = [string, string, string];

export const ARROW_BEST = "#81b64c"; // green: engine recommendation
export const ARROW_BAD = "#ca3431"; // red: mistake / blunder

/**
 * Build the arrows to draw on the position currently shown (ply `ply`):
 *
 *  - GREEN: the engine's best move *from this position* — "play this here".
 *  - RED:   the move actually played *from this position* (i.e. the move that
 *           leads to the next ply) when it was a mistake or blunder.
 *
 * Both arrows describe choices available in the displayed position, so they
 * stay geometrically valid on the board and read together as
 * "engine wanted green, you played red".
 */
export function buildArrows(
  ply: number,
  game: ParsedGame | null,
  results: Record<number, EngineLine>,
  classifications: Record<number, MoveClassification>
): BoardArrow[] {
  if (!game) return [];
  const arrows: BoardArrow[] = [];

  const current = results[ply];
  if (current?.bestMove) {
    arrows.push([
      current.bestMove.slice(0, 2),
      current.bestMove.slice(2, 4),
      ARROW_BEST,
    ]);
  }

  // The move played from this position is the one that produced ply `ply + 1`.
  const nextIndex = ply + 1;
  const nextClass = classifications[nextIndex];
  if (
    nextClass &&
    (nextClass.quality === "mistake" || nextClass.quality === "blunder")
  ) {
    const played = game.plies[nextIndex - 1]; // plies[i].index === i + 1
    if (played) arrows.push([played.from, played.to, ARROW_BAD]);
  }

  return arrows;
}
