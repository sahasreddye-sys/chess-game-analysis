/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // NOTE (Phase 2): Stockfish WASM with threads needs cross-origin isolation.
  // We'll enable these headers then:
  // async headers() {
  //   return [{
  //     source: '/(.*)',
  //     headers: [
  //       { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  //       { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
  //     ],
  //   }];
  // },
};

export default nextConfig;
