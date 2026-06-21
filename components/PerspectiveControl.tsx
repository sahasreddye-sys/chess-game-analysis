"use client";

interface PerspectiveControlProps {
  perspective: "w" | "b";
  setPerspective: (c: "w" | "b") => void;
  username: string;
  setUsername: (name: string) => void;
}

/**
 * Lets the user say which side is "them" — by name (matched against the PGN
 * headers across all games) or by an explicit White/Black toggle fallback.
 */
export default function PerspectiveControl({
  perspective,
  setPerspective,
  username,
  setUsername,
}: PerspectiveControlProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-board-panel p-3 text-sm">
      <span className="text-neutral-400">Analyze for:</span>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Your name (optional)"
        className="rounded-md border border-neutral-700 bg-[#1b1a18] px-2 py-1 text-sm text-neutral-200 outline-none focus:border-classification-best"
      />
      <div className="flex overflow-hidden rounded-md border border-neutral-700">
        {(["w", "b"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setPerspective(c)}
            className={`px-3 py-1 text-sm transition ${
              perspective === c
                ? "bg-classification-best text-black"
                : "bg-board-panelLight text-neutral-300 hover:bg-neutral-600"
            }`}
          >
            {c === "w" ? "White" : "Black"}
          </button>
        ))}
      </div>
      {username.trim() && (
        <span className="text-xs text-neutral-500">
          (name match overrides the toggle per game)
        </span>
      )}
    </div>
  );
}
