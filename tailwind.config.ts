import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        shell: "var(--shell)",
        card: "var(--card)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        cta: "var(--cta)",
        "cta-ink": "var(--cta-ink)",
        highlight: "var(--highlight)",
      },
      boxShadow: {
        soft: "var(--shadow)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        pill: "var(--radius-pill)",
      },
    },
  },
  plugins: [],
};

export default config;
