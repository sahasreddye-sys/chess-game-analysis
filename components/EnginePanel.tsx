"use client";

import { MAX_DEPTH, MIN_DEPTH } from "@/hooks/useReview";
import type { EngineLine, EngineStatus } from "@/lib/engine/types";
import { formatEval, prettyUci } from "@/lib/engine/format";
import type { MoveClassification } from "@/lib/analysis/classify";
import { QUALITY_META } from "@/lib/analysis/quality";
import ClassificationIcon from "./ClassificationIcon";

interface EnginePanelProps {
  status: EngineStatus;
  depth: number;
  setDepth: (depth: number) => void;
  line: EngineLine | undefined;
  progress: { done: number; total: number };
  /** Classification of the move that led to the current position, if any. */
  classification?: MoveClassification;
}

const STATUS_LABEL: Record<string, string> = {
  uninitialized: "Starting…",
  loading: "Loading engine…",
  ready: "Ready",
  analyzing: "Analyzing…",
  error: "Error",
};

/** Engine status, depth control, analysis progress, and current-position line. */
export default function EnginePanel({
  status,
  depth,
  setDepth,
  line,
  progress,
  classification,
}: EnginePanelProps) {
  const pct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const meta = classification ? QUALITY_META[classification.quality] : null;

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-board-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Engine
        </h2>
        <span
          className={`text-xs ${
            status === "error" ? "text-classification-blunder" : "text-neutral-400"
          }`}
        >
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>

      <label className="flex items-center gap-3 text-sm text-neutral-300">
        <span className="w-12 shrink-0">Depth</span>
        <input
          type="range"
          min={MIN_DEPTH}
          max={MAX_DEPTH}
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
          disabled={status === "analyzing"}
          className="flex-1 accent-classification-best disabled:opacity-50"
        />
        <span className="w-6 text-right font-mono">{depth}</span>
      </label>

      {progress.total > 0 && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-neutral-500">
            <span>
              {progress.done}/{progress.total} positions
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-board-panelLight">
            <div
              className="h-full bg-classification-best transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {meta && (
        <div
          className="flex items-center justify-between rounded-md bg-board-panelLight px-3 py-2"
          title={meta.blurb}
        >
          <span className="flex items-center gap-2">
            <ClassificationIcon quality={classification!.quality} size={18} />
            <span className={`text-sm font-semibold ${meta.textClass}`}>{meta.label}</span>
          </span>
          <span className="font-mono text-xs text-neutral-400">
            {classification!.cpLoss > 0
              ? `−${(classification!.cpLoss / 100).toFixed(2)}`
              : "—"}
          </span>
        </div>
      )}

      <div className="rounded-md bg-board-panelLight p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wide text-neutral-500">
            Evaluation
          </span>
          <span className="font-mono text-lg font-bold tabular-nums">
            {formatEval(line)}
          </span>
        </div>
        {line && (
          <div className="mt-2 space-y-1 text-xs text-neutral-400">
            <div>
              <span className="text-neutral-500">Best:</span>{" "}
              <span className="font-mono text-neutral-200">
                {prettyUci(line.bestMove)}
              </span>{" "}
              <span className="text-neutral-600">(depth {line.depth})</span>
            </div>
            {line.pv.length > 0 && (
              <div className="break-words">
                <span className="text-neutral-500">Line:</span>{" "}
                <span className="font-mono">{line.pv.slice(0, 8).join(" ")}</span>
              </div>
            )}
          </div>
        )}
        {!line && status === "analyzing" && (
          <p className="mt-2 text-xs text-neutral-500">Waiting for this position…</p>
        )}
      </div>
    </div>
  );
}
