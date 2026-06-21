"use client";

import type { SavedGame } from "@/lib/storage/types";

interface LibraryModalProps {
  open: boolean;
  onClose: () => void;
  games: SavedGame[];
  onLoad: (game: SavedGame) => void;
  onDelete: (id: string) => void;
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function resultBadge(game: SavedGame): { text: string; cls: string } {
  const r = game.summary.result ?? game.headers["Result"];
  const side = game.side;
  if (r === "1-0") return side === "w" ? { text: "Win", cls: "text-classification-best" } : { text: "Loss", cls: "text-classification-blunder" };
  if (r === "0-1") return side === "b" ? { text: "Win", cls: "text-classification-best" } : { text: "Loss", cls: "text-classification-blunder" };
  if (r === "1/2-1/2") return { text: "Draw", cls: "text-neutral-400" };
  return { text: r ?? "—", cls: "text-neutral-400" };
}

/** A list of the signed-in profile's saved games; load one back or delete it. */
export default function LibraryModal({ open, onClose, games, onLoad, onDelete }: LibraryModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl bg-board-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-700 px-5 py-3">
          <h2 className="text-base font-semibold text-neutral-100">
            Saved games <span className="text-neutral-500">({games.length})</span>
          </h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
          {games.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-neutral-500">
              No saved games yet. Analyze a game and click “Save game”.
            </p>
          ) : (
            <ul className="space-y-2">
              {games.map((g) => {
                const badge = resultBadge(g);
                return (
                  <li
                    key={g.id}
                    className="flex items-center gap-3 rounded-lg bg-board-panelLight px-3 py-2"
                  >
                    <button onClick={() => onLoad(g)} className="min-w-0 flex-1 text-left">
                      <div className="truncate text-sm font-medium text-neutral-100">{g.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-400">
                        <span className={badge.cls}>{badge.text}</span>
                        {g.summary.openingName && <span>{g.summary.openingName}</span>}
                        {g.summary.accuracy != null && (
                          <span>{g.summary.accuracy.toFixed(0)}% acc</span>
                        )}
                        {g.summary.estimatedElo != null && <span>~{g.summary.estimatedElo}</span>}
                        {!g.finished && <span className="text-classification-inaccuracy">partial</span>}
                        <span className="text-neutral-600">{fmtDate(g.updatedAt)}</span>
                      </div>
                    </button>
                    <button
                      onClick={() => onLoad(g)}
                      className="rounded-md bg-classification-best px-3 py-1.5 text-xs font-semibold text-black"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => onDelete(g.id)}
                      className="text-xs text-neutral-500 hover:text-classification-blunder"
                      aria-label={`Delete ${g.title}`}
                    >
                      Delete
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
