# Chess Game Analysis

A free, open-source alternative to Chess.com's Game Review. Paste a PGN and get
a full review — powered entirely by a local Stockfish (WASM) engine. No paid
APIs, no backend.

## Status

Built in phases:

- [x] **Phase 1 — PGN import & board state**: paste a PGN, replay the game on an
      interactive board, navigate with Start / Prev / Next / End (and arrow
      keys), click any move in the list to jump.
- [x] **Phase 2 — Stockfish Web Worker + analysis queue**: single-threaded
      Stockfish 16 (WASM) runs in a Web Worker; every position is evaluated
      sequentially at a configurable depth (default 15). Live progress, per-ply
      evaluation, best move, and principal variation.
- [x] **Phase 3 — Evaluation bar**: vertical bar beside the board; White fills
      from White's side, Black from the other, capped at ±5.00, with mate
      handling (`M5`). Updates live as you navigate and flips with the board.
- [x] **Phase 4 — Move classification (Chess.com-style)**: every move graded
      Brilliant / Great / Best / Excellent / Good / Book / Forced / Inaccuracy /
      Mistake / Blunder, each with a colored SVG badge and a hover explanation of
      *why* it got that label. Uses MultiPV=2 to detect "only good move" (Great),
      static-exchange analysis for sound sacrifices (Brilliant), a built-in
      opening book for Book moves + opening naming, and legal-move counting for
      Forced. Playing the engine's top move never counts as a loss.
- [x] **Phase 5 — Arrow overlays + board controls**: green arrow for the
      engine's best move, red arrow for a mistake/blunder played. Flip the board
      (button or `f`), step through key moments only, smooth piece animation.
- [x] **Advanced review**:
  - **Move explanations & tactical themes** — per-mistake reasons ("you hung
    your knight on e4", "you allowed a forced mate") from static board analysis
    (SEE-based hanging-piece detection, fork detection via `attackers()`,
    mate/missed-mate, back-rank traps) plus the better move and engine line.
  - **Match Summary / highlights** — biggest blunder, best move, critical turning
    point, missed opportunities and tactical moments, each clickable to the board.
  - **Winning-chances graph** — White win-probability across the game as a filled
    area with notable-move dots; click anywhere to jump there.
  - **Strengths & weaknesses** — top 3 each, turning points, "why did I lose",
    study recommendations, suggested puzzle themes, opening advice.
  - **Statistics & Elo** — per-side accuracy (Lichess win-probability model),
    ACPL, classification counts, best-move %, accuracy *and an estimated Elo* for
    each phase (opening / middlegame / endgame) plus an overall performance rating.
  - **Coach** — a fully local, rule-based narrative summary with prioritised
    takeaways and pre-answered questions (no external API).
  - **Multi-game tracking** — paste several PGNs, switch between them, and see a
    Trends dashboard: win rate, average accuracy/ACPL, most common weaknesses,
    opening performance, and a blunder heatmap. Your side is detected per game
    by name match (or a White/Black toggle).
  - **Responsive** — board-first layout on mobile, three columns on desktop.
- [x] **Profiles & saved games**: create local profiles (with an optional PIN —
      a soft lock, not real security), save analyzed games to your profile, and
      reopen them later — the cached engine analysis is restored instantly, no
      re-analysis. Each profile has its own library. Everything is stored in the
      browser via a swappable `StorageProvider` (see below).

## Storage & accounts

Persistence goes through one interface, `StorageProvider`
([lib/storage/types.ts](lib/storage/types.ts)). The only implementation today is
`LocalStorageProvider` ([lib/storage/local.ts](lib/storage/local.ts)), backed by
**IndexedDB** — so profiles and games live in the browser, with no server and no
paid services. `getStorage()` ([lib/storage/index.ts](lib/storage/index.ts)) is
the single swap seam: implement `StorageProvider` against a backend (e.g.
Supabase, gated on `NEXT_PUBLIC_SUPABASE_URL`) and return it there to get real
cross-device accounts — no UI or hook changes required. The optional profile PIN
is hashed (SHA-256 + per-profile salt) but is only a convenience lock, since any
local data is readable from the browser's dev tools.

## Tech stack

- **Next.js (App Router)** + **React** + **TypeScript**
- **Tailwind CSS**
- **chess.js** — PGN parsing, move legality, FEN generation
- **react-chessboard** — board UI
- **stockfish.js (WASM)** in a Web Worker (Phase 2)

## Getting started

```bash
npm install      # also copies the Stockfish engine into public/ (postinstall)
npm run dev
# open http://localhost:3000
```

Paste a PGN (or click **Load sample**) and hit **Analyze**. The engine then
evaluates every position in the background.

## Deploying as a static site (no server)

The app is a **fully static site** — there is no Node server in production. It
has no API routes and no server-side data fetching, so `next build` is
configured to emit a static export (`output: "export"` in
[next.config.mjs](next.config.mjs)):

```bash
npm run build     # produces a static ./out folder (HTML/CSS/JS + engine)
```

Serve the contents of `out/` from **any** static host (GitHub Pages, Netlify,
Cloudflare Pages, S3, `npx serve out`, …). No `npm start`, no running server.

**GitHub Pages** is wired up via [.github/workflows/deploy.yml](.github/workflows/deploy.yml):

1. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main`. The workflow runs `npm ci` (which copies the engine via the
   postinstall script), builds the static export with `BASE_PATH=/chess-game-analysis`,
   and publishes `out/`.
3. The site goes live at `https://<user>.github.io/chess-game-analysis/`.

The `BASE_PATH` env var sets the sub-path the site is served from (a Pages
*project* site lives at `/<repo>`); it's also baked into the Stockfish worker
URL so the engine loads correctly. For a root deploy (custom domain, Netlify,
user/org Pages site) leave `BASE_PATH` unset.

### Engine notes

- We ship the **single-threaded** Stockfish 16 build on purpose: it doesn't use
  `SharedArrayBuffer`, so the app runs **without** cross-origin-isolation
  (COOP/COEP) headers.
- The engine files live in `public/stockfish/` and are **gitignored** — they're
  copied from `node_modules/stockfish` by `scripts/copy-engine.mjs` on
  `postinstall` (or run `npm run setup:engine` manually). This includes a ~40 MB
  NNUE network, which the browser downloads once and caches.
- Stockfish is **GPLv3**. If you redistribute this app, comply with GPLv3 for
  the engine.
- Changing the depth slider doesn't auto re-run; click **Analyze** again to
  re-evaluate at the new depth.

## Architecture

State is keyed by **ply index** (0 = starting position, N = after the Nth
half-move). Every feature — eval bar, classification, arrows, explanations — is
"data indexed by ply," so phases compose without rewrites.

```
lib/      pure domain logic (PGN parsing, later: classification, explanations)
hooks/    React state (useGameState; later: useEngine, useAnalysis)
components/ presentational UI driven by props
app/      Next.js routes + composition root
```
