import type { GameStats, SideStats } from "./stats";
import type { SideInsights } from "./insights";
import type { Highlights } from "./highlights";
import { eloBand } from "./elo";

export interface CoachQA {
  q: string;
  /** The answer, plus an optional ply to jump to on the board. */
  a: string;
  ply?: number;
}

export interface CoachReport {
  /** A short, friendly narrative summary of the game. */
  narrative: string;
  /** Concrete, prioritised takeaways. */
  takeaways: string[];
  /** Pre-answered questions a player might ask their coach. */
  qa: CoachQA[];
}

function phaseWord(name: string, acc: number | null): string | null {
  if (acc === null) return null;
  const quality =
    acc >= 90 ? "excellent" : acc >= 80 ? "solid" : acc >= 70 ? "shaky" : "poor";
  return `${quality} in the ${name} (${acc.toFixed(0)}%)`;
}

/**
 * A lightweight, fully local "coach": it turns the computed statistics,
 * insights and highlights into a friendly narrative, a prioritised set of
 * takeaways, and a handful of pre-answered questions. No external model is
 * called — the app stays 100% client-side.
 */
export function buildCoach(
  stats: GameStats,
  insights: SideInsights,
  highlights: Highlights,
  side: "w" | "b",
  openingName: string | null
): CoachReport {
  const s: SideStats = side === "w" ? stats.white : stats.black;
  const elo = s.estimatedElo;
  const result =
    insights.resultText === "You won this game."
      ? "win"
      : insights.resultText === "You lost this game."
      ? "loss"
      : "other";

  // ---- Narrative ----
  const phases = [
    phaseWord("opening", s.phase.opening.accuracy),
    phaseWord("middlegame", s.phase.middlegame.accuracy),
    phaseWord("endgame", s.phase.endgame.accuracy),
  ].filter(Boolean) as string[];

  const opener = openingName ? `You reached a ${openingName}. ` : "";
  const verdict =
    result === "win"
      ? "Nice result — let's tighten the rough edges so you win like this more often."
      : result === "loss"
      ? "This one got away, but every loss has one or two concrete lessons in it."
      : "A balanced fight — here's where the small margins were.";

  const narrative =
    `${opener}You played at roughly ${s.accuracy.toFixed(0)}% accuracy` +
    (elo ? ` (about a ${elo} performance — ${eloBand(elo).toLowerCase()})` : "") +
    `. ` +
    (phases.length ? `You were ${joinList(phases)}. ` : "") +
    verdict;

  // ---- Takeaways ----
  const takeaways: string[] = [];
  if (highlights.biggestBlunder) {
    takeaways.push(
      `Your costliest moment was ${moveRef(highlights.biggestBlunder.moveNumber, highlights.biggestBlunder.color, highlights.biggestBlunder.san)} — ${lower(highlights.biggestBlunder.detail)}`
    );
  }
  if (s.blunders + s.mistakes >= 3) {
    takeaways.push(
      `You made ${s.blunders} blunder(s) and ${s.mistakes} mistake(s). Before each move, do a 5-second check: "Is anything of mine hanging? What is my opponent threatening?"`
    );
  }
  for (const w of insights.weaknesses.slice(0, 2)) {
    takeaways.push(`${w.title}: ${w.detail}`);
  }
  if (insights.recommendations[0]) takeaways.push(insights.recommendations[0]);
  if (takeaways.length === 0)
    takeaways.push("Clean game — keep reviewing to stay sharp and spot small improvements.");

  // ---- Q&A ----
  const qa: CoachQA[] = [];

  qa.push({
    q: "What was my biggest mistake?",
    a: highlights.biggestBlunder
      ? `${moveRef(highlights.biggestBlunder.moveNumber, highlights.biggestBlunder.color, highlights.biggestBlunder.san)}: ${highlights.biggestBlunder.detail}`
      : "No serious blunders this game — your errors were minor. Well done.",
    ply: highlights.biggestBlunder?.ply,
  });

  qa.push({
    q: "What did I do well?",
    a: insights.strengths.map((x) => x.title).join("; ") + ".",
  });

  const phaseRows: [string, number | null, number | null][] = [
    ["Opening", s.phase.opening.accuracy, s.phase.opening.elo],
    ["Middlegame", s.phase.middlegame.accuracy, s.phase.middlegame.elo],
    ["Endgame", s.phase.endgame.accuracy, s.phase.endgame.elo],
  ];
  qa.push({
    q: "How were my three phases?",
    a: phaseRows
      .map(([n, acc, e]) =>
        acc === null ? `${n}: n/a` : `${n}: ${acc.toFixed(0)}%${e ? ` (~${e})` : ""}`
      )
      .join(" · "),
  });

  qa.push({
    q: "What should I study next?",
    a: insights.recommendations.slice(0, 2).join(" ") || insights.openingSuggestion,
  });

  qa.push({
    q: "What's my estimated level this game?",
    a: elo
      ? `About ${elo} — ${eloBand(elo)}. Remember this is a single-game estimate and will swing game to game.`
      : "Not enough evaluated moves to estimate a level for this game.",
  });

  if (highlights.bestMove) {
    qa.push({
      q: "What was my best move?",
      a: `${moveRef(highlights.bestMove.moveNumber, highlights.bestMove.color, highlights.bestMove.san)} — ${highlights.bestMove.detail}`,
      ply: highlights.bestMove.ply,
    });
  }

  return { narrative, takeaways, qa };
}

function joinList(items: string[]): string {
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

function moveRef(moveNumber: number, color: "w" | "b", san: string): string {
  return `${moveNumber}.${color === "b" ? ".." : ""} ${san}`;
}

function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
