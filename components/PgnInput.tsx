"use client";

import { useState } from "react";

interface PgnInputProps {
  onAnalyze: (pgn: string) => void;
  error: string | null;
}

const SAMPLE_PGN = `[Event "Casual Game"]
[Site "?"]
[Date "????.??.??"]
[White "Player"]
[Black "Opponent"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6
8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. c4 c6 12. cxb5 axb5 13. Nc3 Bb7 1-0`;

/**
 * PGN entry: a textarea plus an Analyze button. In Phase 1 "Analyze" just
 * parses and loads the game; in Phase 2 it will also kick off the engine queue.
 */
export default function PgnInput({ onAnalyze, error }: PgnInputProps) {
  const [pgn, setPgn] = useState("");

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-board-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Paste PGN
        </h2>
        <button
          type="button"
          onClick={() => setPgn(SAMPLE_PGN)}
          className="text-xs text-neutral-400 underline-offset-2 hover:text-neutral-200 hover:underline"
        >
          Load sample
        </button>
      </div>

      <textarea
        value={pgn}
        onChange={(e) => setPgn(e.target.value)}
        placeholder="Paste one or more game PGNs here…"
        spellCheck={false}
        className="h-40 w-full resize-y rounded-md border border-neutral-700 bg-[#1b1a18] p-3 font-mono text-sm text-neutral-200 outline-none focus:border-classification-best"
      />

      {error && (
        <p className="rounded-md bg-classification-blunder/15 px-3 py-2 text-sm text-classification-blunder">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => onAnalyze(pgn)}
        className="rounded-md bg-classification-best px-4 py-2 font-semibold text-black transition hover:brightness-110 active:brightness-95"
      >
        Analyze
      </button>
    </div>
  );
}
