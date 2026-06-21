import type { EngineLine } from "./types";

/**
 * Format an engine line as a human-readable evaluation string, White POV.
 *   +1.35   White is better by ~1.35 pawns
 *   -0.80   Black is better
 *   M5      White mates in 5
 *   -M3     Black mates in 3
 */
export function formatEval(line: EngineLine | undefined): string {
  if (!line) return "–";
  if (line.mate !== null) {
    const sign = line.mate > 0 ? "" : "-";
    return `${sign}M${Math.abs(line.mate)}`;
  }
  if (line.scoreCp === null) return "–";
  const pawns = line.scoreCp / 100;
  const sign = pawns > 0 ? "+" : pawns < 0 ? "" : "";
  return `${sign}${pawns.toFixed(2)}`;
}

/** Convert a UCI move ("e2e4", "e7e8q") to a readable "e2→e4" / "e7→e8=Q". */
export function prettyUci(uci: string | null): string {
  if (!uci) return "–";
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promo = uci.slice(4, 5);
  return `${from}→${to}${promo ? "=" + promo.toUpperCase() : ""}`;
}
