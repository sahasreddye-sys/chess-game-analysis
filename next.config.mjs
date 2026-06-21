/** @type {import('next').NextConfig} */

// Static HTML export: `next build` emits a plain `out/` folder of HTML/CSS/JS
// that any static host serves with no Node server. This works because the app
// is 100% client-side — no API routes, no server data fetching — and we ship
// the single-threaded Stockfish build, so no cross-origin-isolation headers
// (which a static host can't set anyway) are required.

// Optional sub-path the site is served from (e.g. a GitHub Pages project site
// lives at /<repo>). Defaults to root ("") so Netlify/Vercel/custom domains and
// local `next dev` just work; the Pages workflow sets BASE_PATH=/chess-game-analysis.
const basePath = process.env.BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  // Exposed to client code (e.g. the Stockfish worker URL) so asset paths
  // resolve correctly under a sub-path.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
