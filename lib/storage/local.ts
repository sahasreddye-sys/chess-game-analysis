import type {
  Account,
  SaveGameInput,
  SavedGame,
  StorageProvider,
} from "./types";

const DB_NAME = "chess-analysis";
const DB_VERSION = 1;
const STORE_ACCOUNTS = "accounts";
const STORE_GAMES = "games";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ACCOUNTS)) {
        db.createObjectStore(STORE_ACCOUNTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_GAMES)) {
        const games = db.createObjectStore(STORE_GAMES, { keyPath: "id" });
        games.createIndex("accountId", "accountId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to open database."));
  });
  return dbPromise;
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("Storage error."));
      })
  );
}

function getAllByIndex<T>(
  store: string,
  index: string,
  key: IDBValidKey
): Promise<T[]> {
  return openDb().then(
    (db) =>
      new Promise<T[]>((resolve, reject) => {
        const req = db
          .transaction(store, "readonly")
          .objectStore(store)
          .index(index)
          .getAll(key);
        req.onsuccess = () => resolve(req.result as T[]);
        req.onerror = () => reject(req.error ?? new Error("Storage error."));
      })
  );
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Hash a PIN with a per-account salt (SHA-256). A soft lock, not real auth. */
async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

/**
 * Browser-local storage provider backed by IndexedDB. Data lives only in this
 * browser/device — there is no server. The PIN is an optional soft lock.
 */
export class LocalStorageProvider implements StorageProvider {
  async listAccounts(): Promise<Account[]> {
    const all = await tx<Account[]>(STORE_ACCOUNTS, "readonly", (s) => s.getAll());
    return all.sort((a, b) => a.createdAt - b.createdAt);
  }

  async createAccount(name: string, pin?: string): Promise<Account> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Please enter a profile name.");
    let pinSalt: string | null = null;
    let pinHash: string | null = null;
    if (pin && pin.trim()) {
      pinSalt = uid();
      pinHash = await hashPin(pin.trim(), pinSalt);
    }
    const account: Account = {
      id: uid(),
      name: trimmed,
      createdAt: Date.now(),
      pinSalt,
      pinHash,
    };
    await tx(STORE_ACCOUNTS, "readwrite", (s) => s.put(account));
    return account;
  }

  async deleteAccount(id: string): Promise<void> {
    const games = await this.listGames(id);
    await Promise.all(games.map((g) => this.deleteGame(g.id)));
    await tx(STORE_ACCOUNTS, "readwrite", (s) => s.delete(id));
  }

  private async getAccount(id: string): Promise<Account | null> {
    const acc = await tx<Account | undefined>(STORE_ACCOUNTS, "readonly", (s) => s.get(id));
    return acc ?? null;
  }

  async hasPin(id: string): Promise<boolean> {
    const acc = await this.getAccount(id);
    return !!(acc && acc.pinHash);
  }

  async verifyPin(id: string, pin: string): Promise<boolean> {
    const acc = await this.getAccount(id);
    if (!acc) return false;
    if (!acc.pinHash || !acc.pinSalt) return true; // no PIN set
    const hash = await hashPin(pin.trim(), acc.pinSalt);
    return hash === acc.pinHash;
  }

  async listGames(accountId: string): Promise<SavedGame[]> {
    const games = await getAllByIndex<SavedGame>(STORE_GAMES, "accountId", accountId);
    return games.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getGame(id: string): Promise<SavedGame | null> {
    const g = await tx<SavedGame | undefined>(STORE_GAMES, "readonly", (s) => s.get(id));
    return g ?? null;
  }

  async saveGame(input: SaveGameInput): Promise<SavedGame> {
    const now = Date.now();
    let createdAt = now;
    if (input.id) {
      const existing = await this.getGame(input.id);
      if (existing) createdAt = existing.createdAt;
    }
    const game: SavedGame = {
      ...input,
      id: input.id ?? uid(),
      createdAt,
      updatedAt: now,
    };
    await tx(STORE_GAMES, "readwrite", (s) => s.put(game));
    return game;
  }

  async deleteGame(id: string): Promise<void> {
    await tx(STORE_GAMES, "readwrite", (s) => s.delete(id));
  }
}
