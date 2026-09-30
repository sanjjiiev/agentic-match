import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#07070a", 900: "#0c0c11", 850: "#121218", 800: "#17171f", 700: "#22222c" },
        accent: { DEFAULT: "#a855f7", soft: "#c084fc", deep: "#7c3aed" },
        signal: { DEFAULT: "#4ade80", warn: "#fbbf24", bad: "#f87171" },
      },
      fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"] },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "pulse-dot": { "0%,80%,100%": { opacity: "0.25", transform: "scale(0.8)" }, "40%": { opacity: "1", transform: "scale(1)" } },
        marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
        "sweep": { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out both",
        "pulse-dot": "pulse-dot 1.2s infinite ease-in-out",
        marquee: "marquee 30s linear infinite",
        sweep: "sweep 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;