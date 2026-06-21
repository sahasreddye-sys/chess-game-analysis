import type { EngineLine } from "@/lib/engine/types";
import { winPercentWhite } from "./winprob";

export interface EvalPoint {
  /** Position index (0 = start, N = after ply N). */
  ply: number;
  /** White win probability 0–100, or null if not yet evaluated. */
  win: number | null;
  /** Raw centipawn eval, White POV (null for mate / unevaluated). */
  cp: number | null;
  /** Mate distance, White POV (null if none). */
  mate: number | null;
}

/** Build the per-position White win-probability series for the eval graph. */
export function buildEvalSeries(
  positionsCount: number,
  results: Record<number, EngineLine>
): EvalPoint[] {
  const out: EvalPoint[] = [];
  for (let i = 0; i < positionsCount; i++) {
    const line = results[i];
    out.push({
      ply: i,
      win: winPercentWhite(line),
      cp: line?.scoreCp ?? null,
      mate: line?.mate ?? null,
    });
  }
  return out;
}

/**
 * Win probability for a position from one side's point of view (0–100).
 * Returns null if the position isn't evaluated yet.
 */
export function sideWin(
  line: EngineLine | undefined,
  side: "w" | "b"
): number | null {
  const w = winPercentWhite(line);
  if (w === null) return null;
  return side === "w" ? w : 100 - w;
}
