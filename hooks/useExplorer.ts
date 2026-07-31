"use client";

import { useCallback, useState } from "react";
import { Chess } from "chess.js";
import type { Square, PieceSymbol } from "chess.js";

export interface ExploreMove {
  san: string;
  from: string;
  to: string;
  fen: string;
  color: "w" | "b";
}

export interface Explorer {
  /** Whether the user is currently off the game in a variation. */
  active: boolean;
  /** Position the variation branched from. */
  rootFen: string | null;
  /** Moves played in the variation (in order). */
  line: ExploreMove[];
  /** Current explored position (tip of the line, or root, or null if inactive). */
  currentFen: string | null;
  /** Side to move in the current explored position. */
  turn: "w" | "b" | null;

  /**
   * Try a single move on the current board. When inactive, the move branches
   * off `baseFenWhenInactive` (the game position currently shown). Returns true
   * if the move was legal and applied.
   */
  move: (
    baseFenWhenInactive: string,
    from: string,
    to: string,
    promotion?: string
  ) => boolean;
  /** Apply a sequence of UCI moves (e.g. the engine's best line). */
  playLine: (baseFenWhenInactive: string, uciMoves: string[]) => void;
  /** Keep only the first `count` moves of the variation. */
  truncate: (count: number) => void;
  /** Undo the last variation move. */
  undo: () => void;
  /** Clear the variation back to its branch point (stay in exploration). */
  reset: () => void;
  /** Leave exploration entirely and return to the game. */
  exit: () => void;
}

/** Resolve the position a new move should be played from. */
function baseOf(
  active: boolean,
  rootFen: string | null,
  line: ExploreMove[],
  baseWhenInactive: string
): string {
  if (!active) return baseWhenInactive;
  return line.length ? line[line.length - 1].fen : (rootFen ?? baseWhenInactive);
}

function applyUci(chess: Chess, uci: string): ExploreMove | null {
  try {
    const m = chess.move({
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      promotion: (uci.slice(4, 5) || undefined) as PieceSymbol | undefined,
    });
    if (!m) return null;
    return { san: m.san, from: m.from, to: m.to, fen: chess.fen(), color: m.color };
  } catch {
    return null;
  }
}

/**
 * Manages a "what-if" variation the user explores by moving pieces on the board
 * or stepping into the engine's best line. It's a single mainline branch off a
 * game position — simple to reason about and to render.
 */
export function useExplorer(): Explorer {
  const [active, setActive] = useState(false);
  const [rootFen, setRootFen] = useState<string | null>(null);
  const [line, setLine] = useState<ExploreMove[]>([]);

  const currentFen = active ? (line.length ? line[line.length - 1].fen : rootFen) : null;
  const turn = currentFen ? (currentFen.split(" ")[1] === "b" ? "b" : "w") : null;

  const move = useCallback(
    (baseWhenInactive: string, from: string, to: string, promotion?: string): boolean => {
      const wasActive = active;
      const base = baseOf(wasActive, rootFen, line, baseWhenInactive);
      const chess = new Chess(base);
      let made;
      try {
        made = chess.move({
          from: from as Square,
          to: to as Square,
          promotion: (promotion as PieceSymbol | undefined) ?? "q",
        });
      } catch {
        return false;
      }
      if (!made) return false;
      const node: ExploreMove = {
        san: made.san,
        from: made.from,
        to: made.to,
        fen: chess.fen(),
        color: made.color,
      };
      if (!wasActive) {
        setRootFen(baseWhenInactive);
        setLine([node]);
        setActive(true);
      } else {
        setLine((prev) => [...prev, node]);
      }
      return true;
    },
    [active, rootFen, line]
  );

  const playLine = useCallback(
    (baseWhenInactive: string, uciMoves: string[]) => {
      const wasActive = active;
      const base = baseOf(wasActive, rootFen, line, baseWhenInactive);
      const chess = new Chess(base);
      const nodes: ExploreMove[] = [];
      for (const uci of uciMoves) {
        const node = applyUci(chess, uci);
        if (!node) break;
        nodes.push(node);
      }
      if (nodes.length === 0) return;
      if (!wasActive) {
        setRootFen(baseWhenInactive);
        setLine(nodes);
        setActive(true);
      } else {
        setLine((prev) => [...prev, ...nodes]);
      }
    },
    [active, rootFen, line]
  );

  const truncate = useCallback((count: number) => {
    setLine((prev) => prev.slice(0, Math.max(0, count)));
  }, []);

  const undo = useCallback(() => {
    setLine((prev) => prev.slice(0, -1));
  }, []);

  const reset = useCallback(() => setLine([]), []);

  const exit = useCallback(() => {
    setActive(false);
    setRootFen(null);
    setLine([]);
  }, []);

  return {
    active,
    rootFen,
    line,
    currentFen,
    turn,
    move,
    playLine,
    truncate,
    undo,
    reset,
    exit,
  };
}
