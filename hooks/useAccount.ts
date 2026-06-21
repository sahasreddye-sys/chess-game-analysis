"use client";

import { useCallback, useEffect, useState } from "react";
import { getStorage } from "@/lib/storage";
import type { Account, SaveGameInput, SavedGame } from "@/lib/storage/types";

const ACTIVE_KEY = "chess.activeAccountId";

export interface AccountSession {
  /** All profiles on this device. */
  accounts: Account[];
  /** The signed-in profile, or null. */
  account: Account | null;
  /** Saved games for the signed-in profile. */
  games: SavedGame[];
  /** True once the initial load has completed. */
  ready: boolean;
  error: string | null;
  clearError: () => void;

  createAccount: (name: string, pin?: string) => Promise<void>;
  signIn: (accountId: string, pin?: string) => Promise<boolean>;
  signOut: () => void;
  deleteAccount: (id: string) => Promise<void>;
  hasPin: (id: string) => Promise<boolean>;

  saveGame: (input: SaveGameInput) => Promise<SavedGame>;
  deleteGame: (id: string) => Promise<void>;
  refreshGames: () => Promise<void>;
}

/**
 * Session state for local profiles: which profile is active, its saved games,
 * and the actions to create/switch/sign-out and to save/delete games. All
 * persistence goes through the swappable `StorageProvider`.
 */
export function useAccount(): AccountSession {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [games, setGames] = useState<SavedGame[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGamesFor = useCallback(async (accountId: string) => {
    const list = await getStorage().listGames(accountId);
    setGames(list);
  }, []);

  // Initial load: restore the last active profile (PIN only gates switching in).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await getStorage().listAccounts();
        if (cancelled) return;
        setAccounts(all);
        const activeId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_KEY) : null;
        const active = activeId ? all.find((a) => a.id === activeId) ?? null : null;
        if (active) {
          setAccount(active);
          await loadGamesFor(active.id);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load profiles.");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadGamesFor]);

  const refreshAccounts = useCallback(async () => {
    setAccounts(await getStorage().listAccounts());
  }, []);

  const createAccount = useCallback(
    async (name: string, pin?: string) => {
      try {
        const acc = await getStorage().createAccount(name, pin);
        await refreshAccounts();
        setAccount(acc);
        setGames([]);
        localStorage.setItem(ACTIVE_KEY, acc.id);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create profile.");
        throw e;
      }
    },
    [refreshAccounts]
  );

  const signIn = useCallback(
    async (accountId: string, pin?: string): Promise<boolean> => {
      const ok = await getStorage().verifyPin(accountId, pin ?? "");
      if (!ok) {
        setError("Incorrect PIN.");
        return false;
      }
      const acc = accounts.find((a) => a.id === accountId) ?? null;
      setAccount(acc);
      localStorage.setItem(ACTIVE_KEY, accountId);
      setError(null);
      await loadGamesFor(accountId);
      return true;
    },
    [accounts, loadGamesFor]
  );

  const signOut = useCallback(() => {
    setAccount(null);
    setGames([]);
    if (typeof window !== "undefined") localStorage.removeItem(ACTIVE_KEY);
  }, []);

  const deleteAccount = useCallback(
    async (id: string) => {
      await getStorage().deleteAccount(id);
      await refreshAccounts();
      if (account?.id === id) signOut();
    },
    [account, refreshAccounts, signOut]
  );

  const hasPin = useCallback((id: string) => getStorage().hasPin(id), []);

  const refreshGames = useCallback(async () => {
    if (account) await loadGamesFor(account.id);
  }, [account, loadGamesFor]);

  const saveGame = useCallback(
    async (input: SaveGameInput) => {
      const saved = await getStorage().saveGame(input);
      if (account) await loadGamesFor(account.id);
      return saved;
    },
    [account, loadGamesFor]
  );

  const deleteGame = useCallback(
    async (id: string) => {
      await getStorage().deleteGame(id);
      if (account) await loadGamesFor(account.id);
    },
    [account, loadGamesFor]
  );

  return {
    accounts,
    account,
    games,
    ready,
    error,
    clearError: useCallback(() => setError(null), []),
    createAccount,
    signIn,
    signOut,
    deleteAccount,
    hasPin,
    saveGame,
    deleteGame,
    refreshGames,
  };
}
