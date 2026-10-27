import type { Config } from "tailwindcss";

const terracottaScale = {
  50: "#FBF5F1",
  100: "#F4E5DC",
  200: "#E8C9B7",
  300: "#D7A389",
  400: "#C57A58",
  500: "#B85D3B",
  600: "#B85D3B",
  700: "#96482B",
  800: "#783A24",
  900: "#5E2F1E",
  950: "#381A10",
};

const sageScale = {
  50: "#F3F5F2",
  100: "#E3E8E1",
  200: "#C8D2C4",
  300: "#A3B49D",
  400: "#6B7C65",
  500: "#5C6B57",
  600: "#5C6B57",
  700: "#4A5D4E",
  800: "#3C4B3F",
  900: "#2F3B31",
  950: "#1B231D",
};

const warmTaupeScale = {
  50: "#F6F1E7",
  100: "#EFE8DA",
  200: "#DFD5C3",
  300: "#C8BAA3",
  400: "#A89984",
  500: "#8A7E72",
  600: "#6E6257",
  700: "#52483F",
  800: "#38312B",
  900: "#2C2520",
  950: "#1C1917",
};

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-primary)",
        surface: "var(--bg-surface)",
        "surface-elevated": "var(--bg-elevated)",
        foreground: "var(--text-primary)",
        muted: "var(--text-muted)",
        border: "var(--border-color)",
        accent: "var(--accent-color)",
        terracotta: "#B85D3B",
        sage: "#5C6B57",
        pacer: "#E6D2B5",
        // Remap legacy purple/indigo/cold-gray scales to Warm Terracotta, Botanical Sage & Warm Taupe
        indigo: terracottaScale,
        violet: terracottaScale,
        purple: terracottaScale,
        emerald: sageScale,
        teal: sageScale,
        slate: warmTaupeScale,
        gray: warmTaupeScale,
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        serif: ["var(--font-literata)", "Georgia", "Cambria", "serif"],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
