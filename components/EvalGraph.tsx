"use client";

import { useRef } from "react";
import type { EvalPoint } from "@/lib/analysis/series";
import type { Ply } from "@/lib/types";
import type { MoveClassification, MoveQuality } from "@/lib/analysis/classify";
import { QUALITY_META } from "@/lib/analysis/quality";

interface EvalGraphProps {
  series: EvalPoint[];
  plies: Ply[];
  classifications: Record<number, MoveClassification>;
  currentPly: number;
  onSelect: (ply: number) => void;
}

// Qualities worth marking with a dot on the graph.
const MARKED: MoveQuality[] = ["brilliant", "great", "mistake", "blunder"];

const W = 100;
const H = 40;

/**
 * "Winning chances" graph — White's win probability across the game as a filled
 * area (White fills from the bottom). Notable moves are marked with coloured
 * dots, a cursor line tracks the current position, and clicking anywhere jumps
 * the board to that move.
 */
export default function EvalGraph({
  series,
  plies,
  classifications,
  currentPly,
  onSelect,
}: EvalGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const n = series.length - 1; // number of half-moves
  if (n <= 0) {
    return (
      <div className="rounded-lg bg-board-panel p-4 text-sm text-neutral-500">
        The winning-chances graph appears once analysis starts.
      </div>
    );
  }

  const x = (ply: number) => (ply / n) * W;
  const y = (win: number) => H - (win / 100) * H;

  // Build the filled area from evaluated points (skip not-yet-analysed gaps).
  const pts = series.filter((p) => p.win !== null) as (EvalPoint & { win: number })[];
  let area = "";
  if (pts.length > 0) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    area =
      `M ${x(first.ply)} ${H} ` +
      pts.map((p) => `L ${x(p.ply)} ${y(p.win)}`).join(" ") +
      ` L ${x(last.ply)} ${H} Z`;
  }
  const linePath = pts.length
    ? "M " + pts.map((p) => `${x(p.ply)} ${y(p.win)}`).join(" L ")
    : "";

  const dots = plies
    .filter((p) => MARKED.includes(classifications[p.index]?.quality as MoveQuality))
    .map((p) => {
      const pt = series[p.index];
      if (!pt || pt.win === null) return null;
      const q = classifications[p.index].quality;
      return { ply: p.index, cx: x(p.index), cy: y(pt.win), hex: QUALITY_META[q].hex };
    })
    .filter(Boolean) as { ply: number; cx: number; cy: number; hex: string }[];

  const handleClick = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const frac = (e.clientX - rect.left) / rect.width;
    onSelect(Math.round(frac * n));
  };

  return (
    <div className="rounded-lg bg-board-panel p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Winning chances
        </h3>
        <span className="text-[10px] text-neutral-500">White ▲ · Black ▼</span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-24 w-full cursor-pointer rounded bg-neutral-900"
        onClick={handleClick}
      >
        {/* Black's share is the dark background; White fills up from the bottom. */}
        {area && <path d={area} fill="#e8e8e8" />}
        {linePath && (
          <path d={linePath} fill="none" stroke="#9aa0a6" strokeWidth="0.4" />
        )}
        {/* Equality midline. */}
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#5b5b5b" strokeWidth="0.3" strokeDasharray="1 1" />
        {/* Notable-move dots. */}
        {dots.map((d) => (
          <circle key={d.ply} cx={d.cx} cy={d.cy} r="0.9" fill={d.hex} stroke="#1e1c1a" strokeWidth="0.25" />
        ))}
        {/* Current-position cursor. */}
        <line
          x1={x(currentPly)}
          y1="0"
          x2={x(currentPly)}
          y2={H}
          stroke="#f5c542"
          strokeWidth="0.5"
        />
      </svg>
    </div>
  );
}
