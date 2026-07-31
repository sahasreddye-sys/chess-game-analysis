"use client";

import { Chess } from "chess.js";
import type { Square, PieceSymbol } from "chess.js";
import type { EngineLine } from "@/lib/engine/types";
import type { ExploreMove } from "@/hooks/useExplorer";
import { formatEval } from "@/lib/engine/format";

interface ExplorePanelProps {
  active: boolean;
  line: ExploreMove[];
  /** Position the variation branched from (for move numbering). */
  rootFen: string | null;
  /** Current position shown on the board (game ply or variation tip). */
  baseFen: string;
  /** Engine evaluation of `baseFen`. */
  evalLine: EngineLine | undefined;
  thinking: boolean;
  hasGame: boolean;
  onPlayUci: (uciMoves: string[]) => void;
  onTruncate: (count: number) => void;
  onUndo: () => void;
  onReset: () => void;
  onExit: () => void;
}

/** Convert a UCI principal variation to SAN from a position. */
function pvToSan(fen: string, pv: string[], max = 12): string[] {
  const chess = new Chess(fen);
  const out: string[] = [];
  for (const uci of pv.slice(0, max)) {
    try {
      const m = chess.move({
        from: uci.slice(0, 2) as Square,
        to: uci.slice(2, 4) as Square,
        promotion: (uci.slice(4, 5) || undefined) as PieceSymbol | undefined,
      });
      if (!m) break;
      out.push(m.san);
    } catch {
      break;
    }
  }
  return out;
}

/** Attach correct "12." / "12…" move-number prefixes to a SAN sequence. */
function numbered(startFen: string, sans: string[]): { san: string; prefix: string }[] {
  const parts = startFen.split(" ");
  let fullmove = parseInt(parts[5] ?? "1", 10) || 1;
  let whiteToMove = parts[1] !== "b";
  return sans.map((san, i) => {
    let prefix = "";
    if (whiteToMove) prefix = `${fullmove}. `;
    else if (i === 0) prefix = `${fullmove}… `;
    if (!whiteToMove) fullmove += 1;
    whiteToMove = !whiteToMove;
    return { san, prefix };
  });
}

/**
 * The exploration workspace: shows the engine's best line for the current
 * position (click any move to play it out), and — once the user drags a piece
 * or steps into a line — the live variation with undo / reset / back-to-game.
 */
export default function ExplorePanel({
  active,
  line,
  rootFen,
  baseFen,
  evalLine,
  thinking,
  hasGame,
  onPlayUci,
  onTruncate,
  onUndo,
  onReset,
  onExit,
}: ExplorePanelProps) {
  const pv = evalLine?.pv ?? [];
  const pvTokens = numbered(baseFen, pvToSan(baseFen, pv));
  const lineTokens =
    active && line.length && rootFen ? numbered(rootFen, line.map((m) => m.san)) : [];

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-board-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Explore &amp; best lines
        </h2>
        {active && (
          <button
            onClick={onExit}
            className="rounded-md bg-board-panelLight px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-600"
          >
            ← Back to game
          </button>
        )}
      </div>

      {!hasGame && (
        <p className="text-sm text-neutral-500">Load a game to explore variations.</p>
      )}

      {hasGame && (
        <>
          {active ? (
            <div className="rounded-md bg-board-panelLight p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-classification-great">
                  Variation · off the game
                </span>
                <span className="flex gap-1">
                  <button
                    onClick={onUndo}
                    disabled={line.length === 0}
                    className="rounded px-2 py-0.5 text-xs text-neutral-300 hover:bg-neutral-600 disabled:opacity-40"
                  >
                    Undo
                  </button>
                  <button
                    onClick={onReset}
                    disabled={line.length === 0}
                    className="rounded px-2 py-0.5 text-xs text-neutral-300 hover:bg-neutral-600 disabled:opacity-40"
                  >
                    Reset
                  </button>
                </span>
              </div>
              <div className="flex flex-wrap gap-x-1 gap-y-0.5 text-sm">
                {line.length === 0 ? (
                  <span className="text-xs text-neutral-500">
                    Branch point — drag a piece or play the engine line.
                  </span>
                ) : (
                  lineTokens.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => onTruncate(i + 1)}
                      className="rounded px-1 font-mono text-neutral-200 hover:bg-neutral-600"
                      title="Go to this point in the variation"
                    >
                      {t.prefix}
                      {t.san}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-500">
              Drag any piece on the board to try a move, or click the engine&apos;s line below to
              see what it would have played.
            </p>
          )}

          <div className="flex items-center justify-between rounded-md bg-board-panelLight px-3 py-2">
            <span className="text-xs uppercase tracking-wide text-neutral-500">
              Evaluation {thinking && <span className="text-neutral-600">· thinking…</span>}
            </span>
            <span className="font-mono text-lg font-bold tabular-nums">{formatEval(evalLine)}</span>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-neutral-500">Best line</span>
              <button
                onClick={() => pv.length && onPlayUci(pv.slice(0, 1))}
                disabled={pv.length === 0}
                className="rounded bg-classification-best px-2 py-0.5 text-xs font-semibold text-black disabled:opacity-40"
              >
                ▶ Play best move
              </button>
            </div>
            {pvTokens.length === 0 ? (
              <p className="text-xs text-neutral-500">No line yet for this position.</p>
            ) : (
              <div className="flex flex-wrap gap-x-1 gap-y-0.5 rounded-md bg-board-panelLight p-2 text-sm">
                {pvTokens.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => onPlayUci(pv.slice(0, i + 1))}
                    className="rounded px-1 font-mono text-neutral-200 hover:bg-classification-best hover:text-black"
                    title="Play the engine's line up to here"
                  >
                    {t.prefix}
                    {t.san}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
