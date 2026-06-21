"use client";

import { useCallback, useMemo, useState } from "react";
import { parsePgn, PgnParseError } from "@/lib/pgn";
import type { ParsedGame } from "@/lib/types";

export interface GameState {
  /** The parsed game, or null before any PGN is loaded. */
  game: ParsedGame | null;
  /** Parse error message to surface to the user, or null. */
  error: string | null;
  /**
   * Current ply index. 0 = starting position; N = position after ply N.
   * Always within [0, positions.length - 1].
   */
  ply: number;
  /** FEN of the position currently shown on the board. */
  currentFen: string;

  /** Parse a PGN and load it. Resets navigation to the start. */
  loadPgn: (pgn: string) => void;
  /** Jump to an arbitrary ply (clamped to valid range). */
  goTo: (ply: number) => void;
  goToStart: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  goToEnd: () => void;

  canGoBack: boolean;
  canGoForward: boolean;
}

const STARTING_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/**
 * Owns the loaded game and the navigation cursor (current ply). This is the
 * single source of truth the whole UI reads from; later phases will layer
 * analysis state alongside it, still keyed by ply.
 */
export function useGameState(): GameState {
  const [game, setGame] = useState<ParsedGame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ply, setPly] = useState(0);

  const lastPly = game ? game.positions.length - 1 : 0;

  const loadPgn = useCallback((pgn: string) => {
    try {
      const parsed = parsePgn(pgn);
      setGame(parsed);
      setError(null);
      setPly(0);
    } catch (err) {
      setGame(null);
      setPly(0);
      setError(
        err instanceof PgnParseError
          ? err.message
          : "Something went wrong while parsing the PGN."
      );
    }
  }, []);

  const goTo = useCallback(
    (target: number) => {
      setPly((prev) => {
        const max = game ? game.positions.length - 1 : 0;
        return Math.min(Math.max(target, 0), max);
      });
    },
    [game]
  );

  const goToStart = useCallback(() => goTo(0), [goTo]);
  const goToPrevious = useCallback(() => goTo(ply - 1), [goTo, ply]);
  const goToNext = useCallback(() => goTo(ply + 1), [goTo, ply]);
  const goToEnd = useCallback(() => goTo(lastPly), [goTo, lastPly]);

  const currentFen = useMemo(() => {
    if (!game) return STARTING_FEN;
    return game.positions[ply] ?? STARTING_FEN;
  }, [game, ply]);

  return {
    game,
    error,
    ply,
    currentFen,
    loadPgn,
    goTo,
    goToStart,
    goToPrevious,
    goToNext,
    goToEnd,
    canGoBack: ply > 0,
    canGoForward: ply < lastPly,
  };
}
