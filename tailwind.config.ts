import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        vault: {
          black: "#07070a",
          surface: "#0d0d12",
          card: "#111118",
          hover: "#16161f",
          border: "#1e1e2a",
          bright: "#2a2a3a",
          gold: "#c9a84c",
          "gold-light": "#e2c47a",
          "gold-dim": "#4a3d1a",
          text: "#f0ece8",
          muted: "#8a8680",
          faint: "#3e3c38",
          green: "#50c98a",
          red: "#e06060",
          blue: "#7aaee8",
          purple: "#a891e8",
          rose: "#e87aa0"
        }
      },
      boxShadow: {
        glow: "0 0 52px rgba(201,168,76,0.10)"
      },
      fontFamily: {
        sans: ["Instrument Sans", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Cormorant Garamond", "Georgia", "Cambria", "serif"],
        mono: ["DM Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
