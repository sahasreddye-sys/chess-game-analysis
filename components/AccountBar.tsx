"use client";

import type { Account } from "@/lib/storage/types";

interface AccountBarProps {
  account: Account | null;
  gamesCount: number;
  canSave: boolean;
  saveState: "idle" | "saving" | "saved";
  onOpenAuth: () => void;
  onSignOut: () => void;
  onOpenLibrary: () => void;
  onSave: () => void;
}

/** Top bar: who's signed in, plus save-game and saved-games-library actions. */
export default function AccountBar({
  account,
  gamesCount,
  canSave,
  saveState,
  onOpenAuth,
  onSignOut,
  onOpenLibrary,
  onSave,
}: AccountBarProps) {
  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : "Save game";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-board-panel p-3">
      {account ? (
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-classification-best text-sm font-bold text-black">
            {account.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="leading-tight">
            <div className="text-sm font-medium text-neutral-100">{account.name}</div>
            <button onClick={onSignOut} className="text-xs text-neutral-500 hover:text-neutral-300">
              Sign out
            </button>
          </div>
          <button
            onClick={onOpenAuth}
            className="ml-1 rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:bg-board-panelLight"
          >
            Switch
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-400">Sign in to save your games</span>
          <button
            onClick={onOpenAuth}
            className="rounded-md bg-classification-best px-3 py-1.5 text-sm font-semibold text-black"
          >
            Sign in / new profile
          </button>
        </div>
      )}

      {account && (
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenLibrary}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-board-panelLight"
          >
            Saved games <span className="text-neutral-500">({gamesCount})</span>
          </button>
          <button
            onClick={onSave}
            disabled={!canSave || saveState === "saving"}
            className="rounded-md bg-classification-best px-3 py-1.5 text-sm font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-40"
            title={canSave ? "Save the current game to your profile" : "Analyze a game first"}
          >
            {saveLabel}
          </button>
        </div>
      )}
    </div>
  );
}
