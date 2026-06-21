/**
 * Rough mapping from move accuracy (0–100) to an estimated Elo rating.
 *
 * There is no official public formula for this, so we use a quadratic fit
 * calibrated to feel right against familiar reference points:
 *   ~50% → ~600,  ~75% → ~1350,  ~85% → ~1800,  ~95% → ~2300,  100% → ~2600.
 * It's a rule-of-thumb performance estimate for a single game, not a true
 * rating — short games and forced lines make any such estimate noisy.
 */
export function estimateElo(accuracy: number | null): number | null {
  if (accuracy === null) return null;
  const a = Math.max(0, Math.min(100, accuracy));
  const elo = 0.3889 * a * a - 18.61 * a + 558;
  return Math.round(Math.max(200, Math.min(2900, elo)));
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
