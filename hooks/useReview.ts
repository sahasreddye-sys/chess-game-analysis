"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parsePgn, splitPgns, PgnParseError } from "@/lib/pgn";
import { StockfishEngine } from "@/lib/engine/stockfish";
import type { EngineLine, EngineStatus } from "@/lib/engine/types";
import type { ParsedGame } from "@/lib/types";

export const DEFAULT_DEPTH = 16;
export const MIN_DEPTH = 8;
export const MAX_DEPTH = 22;

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export interface GameEntry {
  id: string;
  label: string;
  /** The raw PGN this entry was parsed from (for saving). */
  pgn: string;
  game: ParsedGame;
  results: Record<number, EngineLine>;
  done: number;
  total: number;
  finished: boolean;
}

/** Parameters for restoring a previously-analyzed game from storage. */
export interface SavedGameLoad {
  pgn: string;
  side: "w" | "b";
  results: Record<number, EngineLine>;
  depth: number;
  finished: boolean;
}

export interface Review {
  games: GameEntry[];
  activeIndex: number;
  activeGame: GameEntry | null;
  setActive: (index: number) => void;

  status: EngineStatus;
  isReady: boolean;
  depth: number;
  setDepth: (d: number) => void;
  error: string | null;

  /** Parse one-or-more PGNs and analyze them all. */
  loadPgns: (text: string) => void;
  /** Restore a saved game with its cached analysis (no re-analysis if complete). */
  loadSavedGame: (saved: SavedGameLoad) => void;

  // Navigation for the active game.
  ply: number;
  currentFen: string;
  goTo: (ply: number) => void;
  goToStart: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  goToEnd: () => void;
  canGoBack: boolean;
  canGoForward: boolean;

  // Board orientation.
  boardOrientation: "white" | "black";
  flipBoard: () => void;

  // User perspective for insights / trends.
  perspective: "w" | "b";
  setPerspective: (c: "w" | "b") => void;
  username: string;
  setUsername: (name: string) => void;
  /** The user's side in a given game (by username match, else perspective). */
  sideForGame: (game: ParsedGame) => "w" | "b";
}

function labelFor(game: ParsedGame, index: number): string {
  const w = game.headers["White"];
  const b = game.headers["Black"];
  return w && b ? `${w} – ${b}` : `Game ${index + 1}`;
}

/**
 * Top-level review state: a list of analyzed games, a shared Stockfish worker
 * that walks every position of every game, navigation for the active game, and
 * the user's perspective for insights.
 */
export function useReview(): Review {
  const engineRef = useRef<StockfishEngine | null>(null);
  const runTokenRef = useRef(0);

  const [games, setGames] = useState<GameEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [ply, setPly] = useState(0);
  const [status, setStatus] = useState<EngineStatus>("uninitialized");
  const [depth, setDepth] = useState(DEFAULT_DEPTH);
  const [error, setError] = useState<string | null>(null);
  const [perspective, setPerspective] = useState<"w" | "b">("w");
  const [username, setUsername] = useState("");
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const flipBoard = useCallback(
    () => setBoardOrientation((o) => (o === "white" ? "black" : "white")),
    []
  );

  // Boot the engine once.
  useEffect(() => {
    let cancelled = false;
    const engine = new StockfishEngine();
    engineRef.current = engine;
    setStatus("loading");
    engine
      .init()
      .then(() => !cancelled && setStatus("ready"))
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Engine failed to load.");
      });
    return () => {
      cancelled = true;
      runTokenRef.current++;
      engine.terminate();
      engineRef.current = null;
    };
  }, []);

  const isReady = status === "ready" || status === "analyzing";

  // Analyze a list of games sequentially: every position of every game.
  const analyzeAll = useCallback(
    (entries: GameEntry[]) => {
      const engine = engineRef.current;
      if (!engine) return;
      const token = ++runTokenRef.current;
      setStatus("analyzing");

      (async () => {
        for (let gi = 0; gi < entries.length; gi++) {
          const entry = entries[gi];
          const positions = entry.game.positions;
          for (let p = 0; p < positions.length; p++) {
            if (token !== runTokenRef.current) return;
            try {
              const line = await engine.evaluate({ fen: positions[p], depth });
              if (token !== runTokenRef.current) return;
              setGames((prev) =>
                prev.map((g) =>
                  g.id === entry.id
                    ? {
                        ...g,
                        results: { ...g.results, [p]: line },
                        done: p + 1,
                        finished: p + 1 === positions.length,
                      }
                    : g
                )
              );
            } catch (err) {
              if (token !== runTokenRef.current) return;
              setStatus("error");
              setError(err instanceof Error ? err.message : "Analysis failed.");
              return;
            }
          }
        }
        if (token === runTokenRef.current) setStatus("ready");
      })();
    },
    [depth]
  );

  const loadPgns = useCallback(
    (text: string) => {
      const chunks = splitPgns(text);
      if (chunks.length === 0) {
        setError("Please paste at least one PGN.");
        return;
      }

      const entries: GameEntry[] = [];
      const failures: number[] = [];
      chunks.forEach((chunk, i) => {
        try {
          const parsed = parsePgn(chunk);
          entries.push({
            id: `${Date.now()}-${i}`,
            label: labelFor(parsed, i),
            pgn: chunk,
            game: parsed,
            results: {},
            done: 0,
            total: parsed.positions.length,
            finished: false,
          });
        } catch (err) {
          if (err instanceof PgnParseError) failures.push(i + 1);
        }
      });

      if (entries.length === 0) {
        setError("Could not parse any valid game from the input.");
        setGames([]);
        return;
      }

      setError(
        failures.length
          ? `Loaded ${entries.length} game(s); skipped ${failures.length} unreadable one(s).`
          : null
      );
      setGames(entries);
      setActiveIndex(0);
      setPly(0);
      analyzeAll(entries);
    },
    [analyzeAll]
  );

  const loadSavedGame = useCallback(
    (saved: SavedGameLoad) => {
      let parsed: ParsedGame;
      try {
        parsed = parsePgn(saved.pgn);
      } catch (err) {
        setError(err instanceof PgnParseError ? err.message : "Could not load this game.");
        return;
      }
      const doneCount = Object.keys(saved.results).length;
      const entry: GameEntry = {
        id: `saved-${Date.now()}`,
        label: labelFor(parsed, 0),
        pgn: saved.pgn,
        game: parsed,
        results: saved.results,
        done: doneCount,
        total: parsed.positions.length,
        finished: saved.finished,
      };
      runTokenRef.current++; // cancel any in-flight analysis
      setError(null);
      setDepth(saved.depth);
      setPerspective(saved.side);
      setGames([entry]);
      setActiveIndex(0);
      setPly(0);
      // If the cached analysis was incomplete, finish it off.
      if (!saved.finished) analyzeAll([entry]);
      else setStatus((s) => (s === "analyzing" ? "ready" : s));
    },
    [analyzeAll]
  );

  const activeGame = games[activeIndex] ?? null;
  const lastPly = activeGame ? activeGame.game.positions.length - 1 : 0;

  const goTo = useCallback(
    (target: number) => {
      setPly(() => Math.min(Math.max(target, 0), lastPly));
    },
    [lastPly]
  );
  const setActive = useCallback((index: number) => {
    setActiveIndex(index);
    setPly(0);
  }, []);

  const currentFen = useMemo(
    () => activeGame?.game.positions[ply] ?? STARTING_FEN,
    [activeGame, ply]
  );

  const sideForGame = useCallback(
    (game: ParsedGame): "w" | "b" => {
      const name = username.trim().toLowerCase();
      if (name) {
        if ((game.headers["White"] ?? "").toLowerCase().includes(name)) return "w";
        if ((game.headers["Black"] ?? "").toLowerCase().includes(name)) return "b";
      }
      return perspective;
    },
    [username, perspective]
  );

  // Auto-orient the board to the user's side when the game (or who "you" are)
  // changes. A manual flip stays until the next such change.
  const activeId = activeGame?.id;
  useEffect(() => {
    if (activeGame) {
      setBoardOrientation(sideForGame(activeGame.game) === "w" ? "white" : "black");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, sideForGame]);

  return {
    games,
    activeIndex,
    activeGame,
    setActive,
    status,
    isReady,
    depth,
    setDepth,
    error,
    loadPgns,
    loadSavedGame,
    ply,
    currentFen,
    goTo,
    goToStart: useCallback(() => goTo(0), [goTo]),
    goToPrevious: useCallback(() => goTo(ply - 1), [goTo, ply]),
    goToNext: useCallback(() => goTo(ply + 1), [goTo, ply]),
    goToEnd: useCallback(() => goTo(lastPly), [goTo, lastPly]),
    canGoBack: ply > 0,
    canGoForward: ply < lastPly,
    boardOrientation,
    flipBoard,
    perspective,
    setPerspective,
    username,
    setUsername,
    sideForGame,
  };
}
