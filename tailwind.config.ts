import type { Config } from "tailwindcss";

// Design tokens for CodeWarrior. Every screen pulls color, type, radius and depth from here.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#1F2440", soft: "#4A5175", mute: "#6B7294" },
        sky: { DEFAULT: "#DFF2FF", deep: "#A9DEFF", night: "#2B2F5E", void: "#1C1F45" },
        line: { DEFAULT: "#D5E4F5", deep: "#C5D7EC" },
        ember: { DEFAULT: "#FF8A00", deep: "#D96F00", soft: "#FFF1E0" },
        ocean: { DEFAULT: "#2D9CDB", deep: "#1F7DB5", soft: "#E2F3FF" },
        grass: { DEFAULT: "#8FDD6A", deep: "#6CC447" },
        gold: { DEFAULT: "#FFC83D", deep: "#E5A300", soft: "#FFF6DB" },
        xp: { DEFAULT: "#8B5CF6", deep: "#6D4BD8", soft: "#F1EAFF" },
        hp: { DEFAULT: "#3EC46D", deep: "#2BA155" },
        danger: { DEFAULT: "#FF5A5F", deep: "#D9434A", soft: "#FFE8EA" },
      },
      fontFamily: {
        display: ['"Lilita One"', "Nunito", "system-ui", "sans-serif"],
        body: ["Nunito", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "Menlo", "monospace"],
      },
      borderRadius: { card: "28px", btn: "18px" },
      boxShadow: {
        card: "0 8px 0 #C5D7EC",
        "card-sm": "0 4px 0 #C5D7EC",
      },
    },
  },
  plugins: [],
};
export default config;
