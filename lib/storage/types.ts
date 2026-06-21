import type { EngineLine } from "@/lib/engine/types";

/**
 * Storage abstraction.
 *
 * The app persists accounts ("profiles") and their saved games through a single
 * `StorageProvider` interface. Today the only implementation is a local,
 * in-browser one (IndexedDB) — see `local.ts`. Because every consumer talks to
 * this interface and nothing else, a cloud implementation (e.g. Supabase) can
 * be dropped in later with no UI changes; see `index.ts` for the seam.
 */

export interface Account {
  id: string;
  name: string;
  createdAt: number;
  /** Salt + hash for an optional profile PIN (a soft lock, NOT real security). */
  pinSalt?: string | null;
  pinHash?: string | null;
}

/** A lightweight summary cached on a saved game for the library list. */
export interface SavedGameSummary {
  accuracy?: number | null;
  estimatedElo?: number | null;
  result?: string | null;
  openingName?: string | null;
}

export interface SavedGame {
  id: string;
  accountId: string;
  /** Display title (defaults to "White – Black"). */
  title: string;
  /** The raw PGN of this single game. */
  pgn: string;
  /** PGN tag pairs, denormalised for quick listing. */
  headers: Record<string, string>;
  /** The user's side in this game. */
  side: "w" | "b";
  /** Depth the cached analysis was run at. */
  depth: number;
  /** Whether the cached analysis covered every position. */
  finished: boolean;
  /** Cached engine evaluations keyed by position index (0..N). */
  results: Record<number, EngineLine>;
  summary: SavedGameSummary;
  createdAt: number;
  updatedAt: number;
}

/** Everything needed to create or update a saved game (id/timestamps managed). */
export type SaveGameInput = Omit<SavedGame, "id" | "createdAt" | "updatedAt"> & {
  /** Provide to update an existing entry; omit to create a new one. */
  id?: string;
};

export interface StorageProvider {
  // --- Accounts ---
  listAccounts(): Promise<Account[]>;
  createAccount(name: string, pin?: string): Promise<Account>;
  deleteAccount(id: string): Promise<void>;
  /** True when the account has no PIN, or the PIN matches. */
  verifyPin(id: string, pin: string): Promise<boolean>;
  hasPin(id: string): Promise<boolean>;

  // --- Games (scoped to an account) ---
  listGames(accountId: string): Promise<SavedGame[]>;
  getGame(id: string): Promise<SavedGame | null>;
  saveGame(input: SaveGameInput): Promise<SavedGame>;
  deleteGame(id: string): Promise<void>;
}
