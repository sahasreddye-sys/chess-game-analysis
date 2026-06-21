import type { ParsedGame } from "@/lib/types";
import type { GameStats } from "./stats";
import type { MoveExplanation } from "./explain";
import type { MoveClassification } from "./classify";
import { resultForSide, themeCountsForSide } from "./insights";
import { THEME_META, type Theme } from "./themes";

export interface GameSummaryInput {
  game: ParsedGame;
  stats: GameStats;
  explanations: Record<number, MoveExplanation>;
  classifications: Record<number, MoveClassification>;
  /** The user's side in this game. */
  side: "w" | "b";
}

export interface OpeningPerformance {
  name: string;
  games: number;
  avgAccuracy: number | null;
  points: number; // win 1, draw 0.5, loss 0
}

export interface Trends {
  gamesAnalyzed: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  avgAccuracy: number;
  avgAcpl: number;
  totalInaccuracies: number;
  totalMistakes: number;
  totalBlunders: number;
  topWeaknesses: { theme: string; label: string; count: number }[];
  openingPerformance: OpeningPerformance[];
  /** 8 rows (rank 8 → rank 1) × 8 files (a → h) of blunder counts. */
  blunderHeatmap: number[][];
}

function openingName(game: ParsedGame): string {
  return (
    game.headers["Opening"] ||
    game.headers["ECO"] ||
    (game.plies[0] ? `1.${game.plies[0].san}${game.plies[1] ? " " + game.plies[1].san : ""}` : "Unknown")
  );
}

/** Aggregate per-game summaries into cross-game trends for the user's side. */
export function aggregateTrends(games: GameSummaryInput[]): Trends {
  const heatmap: number[][] = Array.from({ length: 8 }, () => Array(8).fill(0));
  const themeTotals: Record<string, number> = {};
  const openings = new Map<string, { games: number; accSum: number; accN: number; points: number }>();

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let accSum = 0;
  let accN = 0;
  let acplSum = 0;
  let acplN = 0;
  let inacc = 0;
  let mistakes = 0;
  let blunders = 0;

  for (const g of games) {
    const side = g.side === "w" ? g.stats.white : g.stats.black;

    // Result.
    const r = resultForSide(g.game.headers, g.side);
    if (r === "win") wins++;
    else if (r === "loss") losses++;
    else if (r === "draw") draws++;

    // Accuracy / ACPL.
    if (side.moveCount > 0) {
      accSum += side.accuracy;
      accN++;
      acplSum += side.acpl;
      acplN++;
    }
    inacc += side.inaccuracies;
    mistakes += side.mistakes;
    blunders += side.blunders;

    // Themes (weaknesses).
    const counts = themeCountsForSide(g.game, g.explanations, g.side);
    for (const [t, c] of Object.entries(counts)) themeTotals[t] = (themeTotals[t] ?? 0) + c;

    // Opening performance.
    const name = openingName(g.game);
    const o = openings.get(name) ?? { games: 0, accSum: 0, accN: 0, points: 0 };
    o.games++;
    if (side.phase.opening.accuracy !== null) {
      o.accSum += side.phase.opening.accuracy;
      o.accN++;
    }
    o.points += r === "win" ? 1 : r === "draw" ? 0.5 : 0;
    openings.set(name, o);

    // Blunder heatmap: destination square of each blunder by the user.
    for (const ply of g.game.plies) {
      if (ply.color !== g.side) continue;
      if (g.classifications[ply.index]?.quality !== "blunder") continue;
      const file = ply.to.charCodeAt(0) - 97; // a→0
      const rank = parseInt(ply.to[1], 10); // 1..8
      if (file >= 0 && file < 8 && rank >= 1 && rank <= 8) {
        heatmap[8 - rank][file] += 1; // row 0 = rank 8
      }
    }
  }

  const topWeaknesses = Object.entries(themeTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme, count]) => ({
      theme,
      label: THEME_META[theme as Theme]?.label ?? theme,
      count,
    }));

  const openingPerformance = [...openings.entries()]
    .map(([name, o]) => ({
      name,
      games: o.games,
      avgAccuracy: o.accN ? o.accSum / o.accN : null,
      points: o.points,
    }))
    .sort((a, b) => b.games - a.games);

  const gamesAnalyzed = games.length;
  return {
    gamesAnalyzed,
    wins,
    draws,
    losses,
    winRate: gamesAnalyzed ? (wins / gamesAnalyzed) * 100 : 0,
    avgAccuracy: accN ? accSum / accN : 0,
    avgAcpl: acplN ? acplSum / acplN : 0,
    totalInaccuracies: inacc,
    totalMistakes: mistakes,
    totalBlunders: blunders,
    topWeaknesses,
    openingPerformance,
    blunderHeatmap: heatmap,
  };
}
