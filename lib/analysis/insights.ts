import type { ParsedGame } from "@/lib/types";
import type { GameStats, SideStats } from "./stats";
import type { MoveExplanation } from "./explain";
import { THEME_META, type Theme } from "./themes";

export interface InsightItem {
  title: string;
  detail: string;
}

export interface TurningPoint {
  ply: number;
  moveNumber: number;
  color: "w" | "b";
  san: string;
  headline: string;
  swing: number;
}

export interface SideInsights {
  side: "w" | "b";
  resultText: string;
  summary: string;
  strengths: InsightItem[];
  weaknesses: InsightItem[];
  recommendations: string[];
  puzzleThemes: string[];
  openingSuggestion: string;
  turningPoints: TurningPoint[];
  themeCounts: Record<string, number>;
}

/** Result of the game from one side's perspective. */
export function resultForSide(
  headers: Record<string, string>,
  side: "w" | "b"
): "win" | "loss" | "draw" | "unknown" {
  const r = headers["Result"];
  if (r === "1-0") return side === "w" ? "win" : "loss";
  if (r === "0-1") return side === "b" ? "win" : "loss";
  if (r === "1/2-1/2") return "draw";
  return "unknown";
}

/** Count themes across the flagged moves played by one side. */
export function themeCountsForSide(
  game: ParsedGame,
  explanations: Record<number, MoveExplanation>,
  side: "w" | "b"
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ply of game.plies) {
    if (ply.color !== side) continue;
    const ex = explanations[ply.index];
    if (!ex) continue;
    for (const theme of ex.themes) counts[theme] = (counts[theme] ?? 0) + 1;
  }
  return counts;
}

/**
 * Build strengths, weaknesses, study recommendations and turning points for one
 * side of a single game, combining its statistics with detected themes.
 */
export function buildInsights(
  game: ParsedGame,
  stats: GameStats,
  explanations: Record<number, MoveExplanation>,
  side: "w" | "b"
): SideInsights {
  const s: SideStats = side === "w" ? stats.white : stats.black;
  const themeCounts = themeCountsForSide(game, explanations, side);
  const result = resultForSide(game.headers, side);
  const resultText =
    result === "win"
      ? "You won this game."
      : result === "loss"
      ? "You lost this game."
      : result === "draw"
      ? "This game was a draw."
      : "Result unknown.";

  // ---- Strengths (score each candidate; keep the strongest three) ----
  const strengthPool: { score: number; item: InsightItem }[] = [];
  const open = s.phase.opening.accuracy;
  const mid = s.phase.middlegame.accuracy;
  const end = s.phase.endgame.accuracy;

  if (open !== null && open >= 85)
    strengthPool.push({
      score: open,
      item: { title: "Solid opening play", detail: `You played the opening at ${open.toFixed(0)}% accuracy.` },
    });
  if (s.blunders === 0 && s.mistakes <= 1)
    strengthPool.push({
      score: 90,
      item: { title: "Good tactical awareness", detail: `Only ${s.mistakes} mistake(s) and no blunders.` },
    });
  if (end !== null && end >= 85)
    strengthPool.push({
      score: end,
      item: { title: "Strong endgame technique", detail: `Endgame accuracy of ${end.toFixed(0)}%.` },
    });
  if (mid !== null && mid >= 85)
    strengthPool.push({
      score: mid,
      item: { title: "Sharp middlegame", detail: `Middlegame accuracy of ${mid.toFixed(0)}%.` },
    });
  if (!themeCounts["king-safety"] && !themeCounts["mate-threat"])
    strengthPool.push({
      score: 80,
      item: { title: "Safe king", detail: "You kept your king out of danger." },
    });
  if (s.accuracy >= 85)
    strengthPool.push({
      score: s.accuracy,
      item: { title: "High overall accuracy", detail: `${s.accuracy.toFixed(0)}% accuracy across the game.` },
    });

  const strengths = strengthPool.sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.item);
  if (strengths.length === 0) {
    strengths.push({ title: "Fighting spirit", detail: "Keep working — the patterns below are where to focus." });
  }

  // ---- Weaknesses (score by severity) ----
  const weaknessPool: { score: number; item: InsightItem; themes: Theme[] }[] = [];
  if (themeCounts["hanging-piece"] || s.blunders >= 2)
    weaknessPool.push({
      score: 100 + (themeCounts["hanging-piece"] ?? 0) * 10 + s.blunders * 5,
      item: { title: "Blundering pieces", detail: `You left material hanging ${themeCounts["hanging-piece"] ?? s.blunders} time(s).` },
      themes: ["hanging-piece"],
    });
  if (themeCounts["mate-threat"] || themeCounts["king-safety"] || themeCounts["back-rank"])
    weaknessPool.push({
      score: 95,
      item: { title: "King safety", detail: "Your king came under attacks you didn't see coming." },
      themes: ["king-safety", "back-rank"],
    });
  if (themeCounts["missed-mate"] || themeCounts["fork"])
    weaknessPool.push({
      score: 85,
      item: { title: "Missing tactics", detail: "You overlooked forcing tactical shots." },
      themes: ["fork", "missed-mate"],
    });
  if (open !== null && open < 70)
    weaknessPool.push({
      score: 80,
      item: { title: "Shaky openings", detail: `Opening accuracy was only ${open.toFixed(0)}%.` },
      themes: ["center"],
    });
  if (end !== null && end < 70)
    weaknessPool.push({
      score: 75,
      item: { title: "Endgame mistakes", detail: `Endgame accuracy dropped to ${end.toFixed(0)}%.` },
      themes: ["pawn-structure"],
    });
  if (s.accuracy < 70)
    weaknessPool.push({
      score: 70,
      item: { title: "Inconsistent play", detail: `Overall accuracy of ${s.accuracy.toFixed(0)}% — too many imprecise moves.` },
      themes: ["piece-activity"],
    });

  const topWeaknesses = weaknessPool.sort((a, b) => b.score - a.score).slice(0, 3);
  const weaknesses = topWeaknesses.map((x) => x.item);
  if (weaknesses.length === 0) {
    weaknesses.push({ title: "No major weaknesses", detail: "A clean game — keep it up." });
  }

  // ---- Recommendations + puzzle themes from the dominant themes ----
  const themeOrder = Object.entries(themeCounts).sort((a, b) => b[1] - a[1]).map(([t]) => t as Theme);
  const focusThemes = (themeOrder.length ? themeOrder : topWeaknesses.flatMap((w) => w.themes)).slice(0, 4);
  const recommendations = focusThemes.map((t) => THEME_META[t]?.study).filter(Boolean) as string[];
  const puzzleThemes = [...new Set(focusThemes.map((t) => THEME_META[t]?.puzzle).filter(Boolean))] as string[];
  if (recommendations.length === 0)
    recommendations.push("Review your games regularly and double-check every move for opponent threats.");

  // ---- Opening suggestion ----
  const openingName = game.headers["Opening"] || game.headers["ECO"];
  const openingSuggestion =
    open !== null && open < 75
      ? openingName
        ? `Your opening accuracy was ${open.toFixed(0)}%. Study the main lines of ${openingName} to reach the middlegame on equal footing.`
        : `Your opening accuracy was ${open.toFixed(0)}%. Build a small, reliable opening repertoire so you know the first 8–10 moves.`
      : openingName
      ? `Your opening (${openingName}) held up well — keep deepening it.`
      : "Your opening play was sound.";

  // ---- Turning points: biggest swings for this side ----
  const turningPoints: TurningPoint[] = game.plies
    .filter((p) => p.color === side && explanations[p.index])
    .map((p) => ({
      ply: p.index,
      moveNumber: p.moveNumber,
      color: p.color,
      san: p.san,
      headline: explanations[p.index].headline,
      swing: explanations[p.index].evalSwing,
    }))
    .sort((a, b) => b.swing - a.swing)
    .slice(0, 3);

  // ---- Summary: why the game went the way it did ----
  let summary: string;
  const worst = turningPoints[0];
  if (result === "loss") {
    summary = worst
      ? `The game turned on move ${worst.moveNumber} (${worst.san}): ${worst.headline.toLowerCase()} That was the costliest moment.`
      : "You were gradually outplayed — no single blunder, but small inaccuracies added up.";
  } else if (result === "win") {
    summary = worst
      ? `You won, though move ${worst.moveNumber} (${worst.san}) was a risky moment — tighten that up to win more cleanly.`
      : "A clean, controlled win with no major slips.";
  } else if (result === "draw") {
    summary = worst
      ? `A draw — move ${worst.moveNumber} (${worst.san}) was where you let the advantage slip.`
      : "A balanced game that fairly ended in a draw.";
  } else {
    summary = worst ? `Your biggest slip was move ${worst.moveNumber} (${worst.san}).` : "A steady game overall.";
  }

  return {
    side,
    resultText,
    summary,
    strengths,
    weaknesses,
    recommendations,
    puzzleThemes,
    openingSuggestion,
    turningPoints,
    themeCounts,
  };
}
