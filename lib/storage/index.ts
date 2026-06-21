import { LocalStorageProvider } from "./local";
import type { StorageProvider } from "./types";

export * from "./types";

let provider: StorageProvider | null = null;

/**
 * Return the active storage provider (a singleton).
 *
 * This is the single seam for swapping persistence backends. Today it always
 * returns the browser-local IndexedDB provider. To add real cloud accounts
 * later, implement `StorageProvider` against e.g. Supabase and return it here
 * (gated on `process.env.NEXT_PUBLIC_SUPABASE_URL`) — no UI or hook changes
 * are needed, since everything talks to the `StorageProvider` interface.
 */
export function getStorage(): StorageProvider {
  if (!provider) {
    // if (process.env.NEXT_PUBLIC_SUPABASE_URL) provider = new SupabaseStorageProvider();
    provider = new LocalStorageProvider();
  }
  return provider;
}
