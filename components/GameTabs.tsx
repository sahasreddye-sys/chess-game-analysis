"use client";

import type { GameEntry } from "@/hooks/useReview";

interface GameTabsProps {
  games: GameEntry[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

/** Tabs for switching between loaded games (multi-game support). */
export default function GameTabs({ games, activeIndex, onSelect }: GameTabsProps) {
  if (games.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {games.map((g, i) => {
        const pct = g.total > 0 ? Math.round((g.done / g.total) * 100) : 0;
        const active = i === activeIndex;
        return (
          <button
            key={g.id}
            onClick={() => onSelect(i)}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition ${
              active
                ? "bg-classification-best text-black"
                : "bg-board-panel text-neutral-300 hover:bg-board-panelLight"
            }`}
            title={g.label}
          >
            <span className="max-w-[160px] truncate font-medium">{g.label}</span>
            <span className={active ? "text-black/70" : "text-neutral-500"}>
              {g.finished ? "done" : `${pct}%`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
