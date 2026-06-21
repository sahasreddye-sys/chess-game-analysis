/**
 * Copies the single-threaded Stockfish 16 (WASM) build out of node_modules into
 * public/stockfish so it can be served and loaded as a Web Worker.
 *
 * We use the *single-threaded* build on purpose: it does not use
 * SharedArrayBuffer, so the app does NOT need cross-origin-isolation
 * (COOP/COEP) headers to run. The trade-off is slightly slower analysis than
 * the multi-threaded build.
 *
 * Runs automatically via the "postinstall" npm script. Safe to re-run.
 */
import { mkdirSync, copyFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "node_modules", "stockfish", "src");
const dest = join(root, "public", "stockfish");

// The .js worker, its .wasm, and the NNUE network the wasm fetches at runtime.
const FILES = [
  "stockfish-nnue-16-single.js",
  "stockfish-nnue-16-single.wasm",
  "nn-5af11540bbfe.nnue",
];

if (!existsSync(src)) {
  console.warn(
    "[copy-engine] stockfish package not found in node_modules — skipping. " +
      "Run `npm install` first."
  );
  process.exit(0);
}

mkdirSync(dest, { recursive: true });

for (const file of FILES) {
  const from = join(src, file);
  const to = join(dest, file);
  if (!existsSync(from)) {
    console.warn(`[copy-engine] missing source file: ${file} — skipping.`);
    continue;
  }
  copyFileSync(from, to);
  const mb = (statSync(to).size / 1e6).toFixed(1);
  console.log(`[copy-engine] ${file} (${mb} MB)`);
}

console.log("[copy-engine] Done. Engine available at /stockfish/");
