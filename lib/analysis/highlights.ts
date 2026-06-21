import type { ParsedGame } from "@/lib/types";
import type { EngineLine } from "@/lib/engine/types";
import type { MoveClassification } from "./classify";
import type { MoveExplanation } from "./explain";
import { QUALITY_META } from "./quality";
import { sideWin } from "./series";

export interface HighlightMove {
  ply: number;
  moveNumber: number;
  color: "w" | "b";
  san: string;
  /** Quality of the move, if classified. */
  quality?: MoveClassification["quality"];
  /** Short headline shown in the summary. */
  label: string;
  /** Supporting one-liner. */
  detail: string;
}

export interface Highlights {
  biggestBlunder: HighlightMove | null;
  bestMove: HighlightMove | null;
  turningPoint: HighlightMove | null;
  missedOpportunities: HighlightMove[];
  tacticalSequences: HighlightMove[];
}

const TACTICAL = new Set([
  "fork",
  "pin",
  "skewer",
  "discovered-attack",
  "hanging-piece",
  "back-rank",
  "mate-threat",
  "missed-mate",
]);

const PRAISE_RANK: Record<string, number> = {
  brilliant: 3,
  great: 2,
  best: 1,
};

/**
 * Surface the most noteworthy moments of a game from one side's perspective:
 * the biggest blunder, the best move found, the critical turning point, missed
 * opportunities, and tactical moments. Every item is clickable (carries a ply).
 */
export function buildHighlights(
  game: ParsedGame,
  results: Record<number, EngineLine>,
  classifications: Record<number, MoveClassification>,
  explanations: Record<number, MoveExplanation>,
  side: "w" | "b"
): Highlights {
  let biggestBlunder: HighlightMove | null = null;
  let biggestLoss = 0;
  let bestMove: HighlightMove | null = null;
  let bestRank = 0;
  let bestSwing = -Infinity;
  let turningPoint: HighlightMove | null = null;
  let worstSwing = 0; // most negative swing for `side`
  const missedOpportunities: HighlightMove[] = [];
  const tacticalSequences: HighlightMove[] = [];

  for (const ply of game.plies) {
    const cls = classifications[ply.index];
    const ex = explanations[ply.index];
    const winBefore = sideWin(results[ply.index - 1], side);
    const winAfter = sideWin(results[ply.index], side);
    const swing = winBefore !== null && winAfter !== null ? winAfter - winBefore : null;

    // --- Turning point: the biggest swing AGAINST the user (≥ 8% to be worth
    //     calling a turning point), regardless of who moved. ---
    if (swing !== null && swing < worstSwing && swing <= -8) {
      worstSwing = swing;
      const who = ply.color === side ? "Your" : "Opponent's";
      turningPoint = {
        ply: ply.index,
        moveNumber: ply.moveNumber,
        color: ply.color,
        san: ply.san,
        quality: cls?.quality,
        label: "Critical turning point",
        detail: `${who} ${ply.san} swung your winning chances by ${Math.abs(swing).toFixed(0)}%.`,
      };
    }

    // The rest is about the user's own moves.
    if (ply.color !== side) {
      // But opponent tactical shots are still worth surfacing.
      if (ex && ex.themes.some((t) => TACTICAL.has(t)) && tacticalSequences.length < 4) {
        tacticalSequences.push({
          ply: ply.index,
          moveNumber: ply.moveNumber,
          color: ply.color,
          san: ply.san,
          quality: cls?.quality,
          label: "Tactic in the position",
          detail: ex.headline,
        });
      }
      continue;
    }

    // --- Biggest blunder (largest centipawn loss). ---
    if (
      cls &&
      (cls.quality === "blunder" || cls.quality === "mistake") &&
      cls.cpLoss > biggestLoss
    ) {
      biggestLoss = cls.cpLoss;
      biggestBlunder = {
        ply: ply.index,
        moveNumber: ply.moveNumber,
        color: ply.color,
        san: ply.san,
        quality: cls.quality,
        label: "Biggest blunder",
        detail: ex?.headline ?? `${ply.san} lost ${(cls.cpLoss / 100).toFixed(1)} pawns.`,
      };
    }

    // --- Best move (most praiseworthy / most impactful). ---
    if (cls && PRAISE_RANK[cls.quality]) {
      const rank = PRAISE_RANK[cls.quality];
      const impact = swing ?? 0;
      if (rank > bestRank || (rank === bestRank && impact > bestSwing)) {
        bestRank = rank;
        bestSwing = impact;
        bestMove = {
          ply: ply.index,
          moveNumber: ply.moveNumber,
          color: ply.color,
          san: ply.san,
          quality: cls.quality,
          label: `${QUALITY_META[cls.quality].label} move`,
          detail:
            cls.quality === "brilliant"
              ? "A sound sacrifice that kept you on top."
              : cls.quality === "great"
              ? "The only good move in a critical spot."
              : "You found the engine's top choice.",
        };
      }
    }

    // --- Missed opportunities: missed mate, or a winning position thrown away. ---
    const missedMate = ex?.themes.includes("missed-mate");
    const threwAway =
      winBefore !== null &&
      winAfter !== null &&
      winBefore >= 65 &&
      winAfter < 50 &&
      cls &&
      (cls.quality === "mistake" || cls.quality === "blunder");
    if ((missedMate || threwAway) && missedOpportunities.length < 3) {
      missedOpportunities.push({
        ply: ply.index,
        moveNumber: ply.moveNumber,
        color: ply.color,
        san: ply.san,
        quality: cls?.quality,
        label: missedMate ? "Missed forced mate" : "Let a winning position slip",
        detail: ex?.headline ?? `You were winning, but ${ply.san} gave it back.`,
      });
    }

    // --- Tactical moments on the user's side. ---
    if (ex && ex.themes.some((t) => TACTICAL.has(t)) && tacticalSequences.length < 4) {
      tacticalSequences.push({
        ply: ply.index,
        moveNumber: ply.moveNumber,
        color: ply.color,
        san: ply.san,
        quality: cls?.quality,
        label: "Tactical moment",
        detail: ex.headline,
      });
    }
  }

  return { biggestBlunder, bestMove, turningPoint, missedOpportunities, tacticalSequences };
}
