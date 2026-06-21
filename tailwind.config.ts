import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Move classification palette (Chess.com-style).
        classification: {
          brilliant: "#26c2a3",
          great: "#749bbf",
          best: "#81b64c",
          excellent: "#95b776",
          good: "#9eb87a",
          book: "#a88865",
          inaccuracy: "#f7c631",
          mistake: "#e58f2a",
          blunder: "#ca3431",
          forced: "#9aa7b5",
        },
        board: {
          panel: "#262421",
          panelLight: "#302e2c",
        },
      },
    },
  },
  plugins: [],
};

export default config;
