import { Chess } from "chess.js";
import type { ParsedGame, Ply } from "./types";

/**
 * Parse a PGN string into a fully replayed game.
 *
 * Pure function — no React, no side effects. We replay the move list move by
 * move so we capture an exact FEN before and after each ply. This is the data
 * structure every later phase (eval bar, classification, arrows, explanations)
 * reads from.
 *
 * @throws {PgnParseError} if the PGN is empty, malformed, or contains no moves.
 */
export function parsePgn(pgn: string): ParsedGame {
  const trimmed = pgn.trim();
  if (!trimmed) {
    throw new PgnParseError("Please paste a PGN before analyzing.");
  }

  // chess.js throws on syntactically invalid PGN.
  const loader = new Chess();
  try {
    loader.loadPgn(trimmed);
  } catch (err) {
    throw new PgnParseError(
      "Could not parse this PGN. Make sure it's a complete, valid game.",
      { cause: err }
    );
  }

  // chess.js types header values as `string | null`; drop empty/null tags so
  // downstream code can rely on a clean Record<string, string>.
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(loader.header())) {
    if (value != null) headers[key] = value;
  }

  const history = loader.history({ verbose: true });

  if (history.length === 0) {
    throw new PgnParseError("This PGN doesn't contain any moves.");
  }

  // Replay from the game's starting position. If the PGN set up a custom
  // position via the FEN/SetUp tags, honor it; otherwise start from standard.
  const startFen = headers["FEN"];
  const replay = startFen ? new Chess(startFen) : new Chess();

  const positions: string[] = [replay.fen()];
  const plies: Ply[] = [];

  history.forEach((move, i) => {
    const fenBefore = replay.fen();
    replay.move(move.san);
    const fenAfter = replay.fen();
    positions.push(fenAfter);

    plies.push({
      index: i + 1,
      moveNumber: Math.floor(i / 2) + 1,
      color: move.color,
      san: move.san,
      from: move.from,
      to: move.to,
      promotion: move.promotion,
      fenBefore,
      fenAfter,
    });
  });

  return { headers, positions, plies };
}

/**
 * Split a string that may contain several PGN games into individual game
 * strings. A new game is assumed to start at a tag line (`[Event ...]`) once
 * movetext for the previous game has been seen.
 */
export function splitPgns(text: string): string[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const games: string[] = [];
  let current: string[] = [];
  let seenMoves = false;

  for (const line of lines) {
    const isTag = /^\s*\[/.test(line);
    if (isTag && seenMoves) {
      games.push(current.join("\n").trim());
      current = [];
      seenMoves = false;
    }
    if (!isTag && line.trim() !== "") seenMoves = true;
    current.push(line);
  }
  if (current.join("").trim()) games.push(current.join("\n").trim());

  return games.filter((g) => g.trim().length > 0);
}

/** Error thrown when a PGN cannot be parsed. Carries a user-facing message. */
export class PgnParseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PgnParseError";
  }
}
