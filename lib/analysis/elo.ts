/**
 * Rough mapping from (Lichess-style, volatility-weighted) move accuracy to an
 * estimated Elo. There is no official public formula, so we interpolate through
 * calibration anchors chosen to stay grounded against real games rather than
 * flatter the player — e.g. ~63% ≈ 800, ~70% ≈ 1050, ~80% ≈ 1450, ~90% ≈ 2000.
 * It's a noisy single-game estimate, not a true rating.
 */
const ELO_ANCHORS: [number, number][] = [
  [0, 100],
  [30, 250],
  [40, 400],
  [50, 560],
  [60, 740],
  [65, 850],
  [70, 1050],
  [75, 1230],
  [80, 1450],
  [85, 1700],
  [90, 2000],
  [95, 2350],
  [100, 2700],
];

export function estimateElo(accuracy: number | null): number | null {
  if (accuracy === null) return null;
  const a = Math.max(0, Math.min(100, accuracy));
  for (let i = 1; i < ELO_ANCHORS.length; i++) {
    const [x1, y1] = ELO_ANCHORS[i - 1];
    const [x2, y2] = ELO_ANCHORS[i];
    if (a <= x2) {
      const t = (a - x1) / (x2 - x1);
      return Math.round(y1 + t * (y2 - y1));
    }
  }
  return ELO_ANCHORS[ELO_ANCHORS.length - 1][1];
}

/** A coarse descriptive band for an estimated rating. */
export function eloBand(elo: number | null): string {
  if (elo === null) return "—";
  if (elo >= 2200) return "Master level";
  if (elo >= 1900) return "Expert";
  if (elo >= 1600) return "Advanced";
  if (elo >= 1300) return "Intermediate";
  if (elo >= 1000) return "Improver";
  if (elo >= 700) return "Beginner";
  return "Novice";
}
