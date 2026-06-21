/**
 * Tactical / positional themes that the explainer can attach to a move, plus
 * the study + puzzle suggestions each one maps to (used by the insights panel).
 */
export type Theme =
  | "hanging-piece"
  | "fork"
  | "pin"
  | "skewer"
  | "discovered-attack"
  | "back-rank"
  | "king-safety"
  | "mate-threat"
  | "missed-mate"
  | "material"
  | "center"
  | "pawn-structure"
  | "passed-pawn"
  | "piece-activity";

export interface ThemeMeta {
  label: string;
  /** Lichess/Chess.com puzzle theme to train this pattern. */
  puzzle: string;
  /** Short study suggestion shown in recommendations. */
  study: string;
}

export const THEME_META: Record<Theme, ThemeMeta> = {
  "hanging-piece": {
    label: "Hanging pieces",
    puzzle: "Hanging Piece",
    study: "Before every move, check whether your pieces are defended — scan for undefended units.",
  },
  fork: {
    label: "Forks",
    puzzle: "Fork",
    study: "Drill knight and queen forks; watch for enemy pieces on the same knight-move geometry.",
  },
  pin: {
    label: "Pins",
    puzzle: "Pin",
    study: "Study pins along files, ranks and diagonals — especially pins to the king and queen.",
  },
  skewer: {
    label: "Skewers",
    puzzle: "Skewer",
    study: "Practice skewers on open lines where a valuable piece shields a lesser one.",
  },
  "discovered-attack": {
    label: "Discovered attacks",
    puzzle: "Discovered Attack",
    study: "Look for pieces that unveil an attack when they move, especially discovered checks.",
  },
  "back-rank": {
    label: "Back-rank weakness",
    puzzle: "Back Rank Mate",
    study: "Create luft for your king and watch your back rank when major pieces are on the board.",
  },
  "king-safety": {
    label: "King safety",
    puzzle: "Attacking f2/f7",
    study: "Castle early, keep the pawn shield intact, and count attackers vs defenders around your king.",
  },
  "mate-threat": {
    label: "Allowing mate",
    puzzle: "Mate in 2",
    study: "Always check for forcing replies (checks, captures, threats) before committing to a move.",
  },
  "missed-mate": {
    label: "Missed mates",
    puzzle: "Mate in 2",
    study: "When you sense the attack is decisive, calculate forcing lines to the end — don't relax.",
  },
  material: {
    label: "Dropping material",
    puzzle: "Hanging Piece",
    study: "Slow down on captures and trades; verify the full exchange sequence before you commit.",
  },
  center: {
    label: "Center control",
    puzzle: "Advantage",
    study: "Fight for the center with pawns and pieces; avoid surrendering central squares for free.",
  },
  "pawn-structure": {
    label: "Pawn structure",
    puzzle: "Endgame",
    study: "Avoid creating isolated, doubled or backward pawns without compensation.",
  },
  "passed-pawn": {
    label: "Passed pawns",
    puzzle: "Endgame",
    study: "Learn to create and blockade passed pawns; they decide many endgames.",
  },
  "piece-activity": {
    label: "Piece activity",
    puzzle: "Advantage",
    study: "Keep every piece doing a job — reroute passive pieces to active squares.",
  },
};
