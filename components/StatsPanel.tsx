"use client";

import type { GameStats, SideStats } from "@/lib/analysis/stats";
import { QUALITY_META, QUALITY_ORDER } from "@/lib/analysis/quality";
import { eloBand } from "@/lib/analysis/elo";
import ClassificationIcon from "./ClassificationIcon";

interface StatsPanelProps {
  stats: GameStats;
  whiteName: string;
  blackName: string;
}

function accColor(acc: number): string {
  if (acc >= 90) return "text-classification-best";
  if (acc >= 80) return "text-classification-excellent";
  if (acc >= 65) return "text-classification-inaccuracy";
  return "text-classification-blunder";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-800 py-1.5 text-sm">
      <span className="text-neutral-400">{label}</span>
      <span className="font-mono text-neutral-100">{value}</span>
    </div>
  );
}

function PhaseRow({
  label,
  acc,
  elo,
}: {
  label: string;
  acc: number | null;
  elo: number | null;
}) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-800 py-1.5 text-sm">
      <span className="text-neutral-400">{label}</span>
      <span className="flex items-center gap-3 font-mono">
        <span className="text-neutral-100">{acc === null ? "—" : `${acc.toFixed(0)}%`}</span>
        <span className="w-12 text-right text-neutral-500">{elo === null ? "" : `~${elo}`}</span>
      </span>
    </div>
  );
}

function SideColumn({ name, s }: { name: string; s: SideStats }) {
  return (
    <div className="flex-1 rounded-lg bg-board-panel p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="truncate font-semibold text-neutral-100" title={name}>
          {name}
        </h3>
        <span className={`text-2xl font-bold ${accColor(s.accuracy)}`}>
          {s.accuracy.toFixed(0)}
          <span className="text-sm text-neutral-500">%</span>
        </span>
      </div>

      {/* Estimated performance rating */}
      <div className="mb-3 flex items-center justify-between rounded-md bg-board-panelLight px-3 py-2">
        <span className="text-xs uppercase tracking-wide text-neutral-500">
          Est. performance
        </span>
        <span className="text-right">
          <span className="font-mono text-lg font-bold text-neutral-100">
            {s.estimatedElo ?? "—"}
          </span>
          <span className="ml-2 text-xs text-neutral-400">{eloBand(s.estimatedElo)}</span>
        </span>
      </div>

      {/* Classification breakdown */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {QUALITY_ORDER.filter((q) => s.counts[q] > 0).map((q) => (
          <span
            key={q}
            title={QUALITY_META[q].label}
            className="flex items-center gap-1 rounded bg-board-panelLight px-1.5 py-0.5 text-xs"
          >
            <ClassificationIcon quality={q} size={13} />
            <span className="font-mono text-neutral-200">{s.counts[q]}</span>
          </span>
        ))}
      </div>

      <Stat label="Avg centipawn loss" value={s.acpl.toFixed(0)} />
      <Stat label="Best-move %" value={`${s.bestMovePct.toFixed(0)}%`} />
      <Stat label="Inaccuracies" value={`${s.inaccuracies}`} />
      <Stat label="Mistakes" value={`${s.mistakes}`} />
      <Stat label="Blunders" value={`${s.blunders}`} />

      <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-wide text-neutral-500">
        <span>Phase</span>
        <span className="flex gap-3">
          <span>Accuracy</span>
          <span className="w-12 text-right">Elo</span>
        </span>
      </div>
      <PhaseRow label="Opening" acc={s.phase.opening.accuracy} elo={s.phase.opening.elo} />
      <PhaseRow label="Middlegame" acc={s.phase.middlegame.accuracy} elo={s.phase.middlegame.elo} />
      <PhaseRow label="Endgame" acc={s.phase.endgame.accuracy} elo={s.phase.endgame.elo} />
    </div>
  );
}

/** Side-by-side statistics dashboard for both players. */
export default function StatsPanel({ stats, whiteName, blackName }: StatsPanelProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <SideColumn name={whiteName} s={stats.white} />
      <SideColumn name={blackName} s={stats.black} />
    </div>
  );
}
