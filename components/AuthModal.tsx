"use client";

import { useState } from "react";
import type { Account } from "@/lib/storage/types";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  currentAccountId?: string | null;
  error: string | null;
  clearError: () => void;
  onCreate: (name: string, pin?: string) => Promise<void>;
  onSignIn: (accountId: string, pin?: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
}

/**
 * Profile chooser: pick an existing local profile (entering its PIN if it has
 * one) or create a new one. Profiles and their games live only in this browser.
 */
export default function AuthModal({
  open,
  onClose,
  accounts,
  currentAccountId,
  error,
  clearError,
  onCreate,
  onSignIn,
  onDelete,
}: AuthModalProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinFor, setPinFor] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const reset = () => {
    setCreating(false);
    setName("");
    setNewPin("");
    setPinFor(null);
    setPin("");
    clearError();
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleSelect = async (acc: Account) => {
    clearError();
    if (acc.pinHash) {
      setPinFor(acc.id);
      setPin("");
      return;
    }
    setBusy(true);
    const ok = await onSignIn(acc.id);
    setBusy(false);
    if (ok) close();
  };

  const handleUnlock = async () => {
    if (!pinFor) return;
    setBusy(true);
    const ok = await onSignIn(pinFor, pin);
    setBusy(false);
    if (ok) close();
  };

  const handleCreate = async () => {
    setBusy(true);
    try {
      await onCreate(name, newPin || undefined);
      close();
    } catch {
      /* error surfaced via props */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={close}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-board-panel p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-100">
            {creating ? "New profile" : "Choose a profile"}
          </h2>
          <button onClick={close} className="text-neutral-500 hover:text-neutral-300" aria-label="Close">
            ✕
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded-md bg-classification-blunder/15 px-3 py-2 text-sm text-classification-blunder">
            {error}
          </p>
        )}

        {!creating && (
          <>
            <div className="mb-3 space-y-2">
              {accounts.length === 0 && (
                <p className="text-sm text-neutral-500">
                  No profiles yet. Create one to start saving games.
                </p>
              )}
              {accounts.map((acc) => (
                <div key={acc.id} className="rounded-md bg-board-panelLight">
                  <div className="flex items-center justify-between px-3 py-2">
                    <button
                      onClick={() => handleSelect(acc)}
                      disabled={busy}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-classification-best text-xs font-bold text-black">
                        {acc.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="text-sm text-neutral-100">{acc.name}</span>
                      {acc.id === currentAccountId && (
                        <span className="text-xs text-neutral-500">(current)</span>
                      )}
                      {acc.pinHash && <span className="text-xs text-neutral-500">· PIN</span>}
                    </button>
                    <button
                      onClick={() => onDelete(acc.id)}
                      className="ml-2 text-xs text-neutral-500 hover:text-classification-blunder"
                    >
                      Delete
                    </button>
                  </div>
                  {pinFor === acc.id && (
                    <div className="flex gap-2 border-t border-neutral-700 px-3 py-2">
                      <input
                        type="password"
                        inputMode="numeric"
                        value={pin}
                        autoFocus
                        onChange={(e) => setPin(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                        placeholder="PIN"
                        className="flex-1 rounded border border-neutral-700 bg-[#1b1a18] px-2 py-1 text-sm text-neutral-200 outline-none focus:border-classification-best"
                      />
                      <button
                        onClick={handleUnlock}
                        disabled={busy}
                        className="rounded bg-classification-best px-3 py-1 text-sm font-semibold text-black"
                      >
                        Unlock
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                clearError();
                setCreating(true);
              }}
              className="w-full rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:bg-board-panelLight"
            >
              + New profile
            </button>
          </>
        )}

        {creating && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-neutral-500">
                Profile name
              </label>
              <input
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maya"
                className="w-full rounded-md border border-neutral-700 bg-[#1b1a18] px-3 py-2 text-sm text-neutral-200 outline-none focus:border-classification-best"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-neutral-500">
                PIN (optional, soft lock)
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Leave blank for no PIN"
                className="w-full rounded-md border border-neutral-700 bg-[#1b1a18] px-3 py-2 text-sm text-neutral-200 outline-none focus:border-classification-best"
              />
              <p className="mt-1 text-xs text-neutral-600">
                A convenience lock only — not real security. Data stays in this browser.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  clearError();
                  setCreating(false);
                }}
                className="flex-1 rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-board-panelLight"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={busy || !name.trim()}
                className="flex-1 rounded-md bg-classification-best px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
