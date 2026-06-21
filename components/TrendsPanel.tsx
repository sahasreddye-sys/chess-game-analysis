"use client";

import type { Trends } from "@/lib/analysis/aggregate";

interface TrendsPanelProps {
  trends: Trends;
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-board-panel p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-neutral-100">{value}</div>
      {sub && <div className="text-xs text-neutral-400">{sub}</div>}
    </div>
  );
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

/** Cross-game trends: record, averages, weaknesses, openings, blunder heatmap. */
export default function TrendsPanel({ trends }: TrendsPanelProps) {
  const maxHeat = Math.max(1, ...trends.blunderHeatmap.flat());

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Games analyzed" value={`${trends.gamesAnalyzed}`} />
        <Card
          label="Win rate"
          value={`${trends.winRate.toFixed(0)}%`}
          sub={`${trends.wins}W / ${trends.draws}D / ${trends.losses}L`}
        />
        <Card label="Avg accuracy" value={`${trends.avgAccuracy.toFixed(0)}%`} />
        <Card label="Avg centipawn loss" value={trends.avgAcpl.toFixed(0)} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card label="Inaccuracies" value={`${trends.totalInaccuracies}`} />
        <Card label="Mistakes" value={`${trends.totalMistakes}`} />
        <Card label="Blunders" value={`${trends.totalBlunders}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Most common weaknesses */}
        <div className="rounded-lg bg-board-panel p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Most common weaknesses
          </h3>
          {trends.topWeaknesses.length === 0 ? (
            <p className="text-sm text-neutral-500">No recurring weaknesses detected.</p>
          ) : (
            <ul className="space-y-2">
              {trends.topWeaknesses.map((w) => (
                <li key={w.theme} className="text-sm">
                  <div className="flex justify-between text-neutral-200">
                    <span>{w.label}</span>
                    <span className="font-mono text-neutral-400">{w.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-board-panelLight">
                    <div
                      className="h-full bg-classification-blunder"
                      style={{
                        width: `${(w.count / trends.topWeaknesses[0].count) * 100}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Blunder heatmap */}
        <div className="rounded-lg bg-board-panel p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Blunder heatmap
          </h3>
          <p className="mb-2 text-xs text-neutral-500">
            Squares where your blunders landed.
          </p>
          <div className="grid aspect-square w-full max-w-[260px] grid-cols-8 overflow-hidden rounded">
            {trends.blunderHeatmap.map((row, r) =>
              row.map((count, f) => {
                const intensity = count / maxHeat;
                const light = (r + f) % 2 === 0;
                return (
                  <div
                    key={`${r}-${f}`}
                    className="flex items-center justify-center text-[10px] font-bold"
                    style={{
                      backgroundColor:
                        count > 0
                          ? `rgba(202,52,49,${0.25 + intensity * 0.75})`
                          : light
                          ? "#3a3835"
                          : "#2c2a28",
                      color: count > 0 ? "#fff" : "transparent",
                    }}
                    title={`${FILES[f]}${8 - r}: ${count} blunder(s)`}
                  >
                    {count > 0 ? count : ""}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Opening performance */}
      <div className="rounded-lg bg-board-panel p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Opening performance
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="py-1">Opening</th>
              <th className="py-1 text-right">Games</th>
              <th className="py-1 text-right">Accuracy</th>
              <th className="py-1 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {trends.openingPerformance.map((o) => (
              <tr key={o.name} className="border-t border-neutral-800">
                <td className="py-1.5 text-neutral-200">{o.name}</td>
                <td className="py-1.5 text-right font-mono text-neutral-400">{o.games}</td>
                <td className="py-1.5 text-right font-mono text-neutral-300">
                  {o.avgAccuracy === null ? "—" : `${o.avgAccuracy.toFixed(0)}%`}
                </td>
                <td className="py-1.5 text-right font-mono text-neutral-300">
                  {o.points}/{o.games}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
