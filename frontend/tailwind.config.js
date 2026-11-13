/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          light: "#FAF9F6",
          dark: "#0E1015",
        },
        surface: {
          light: "#FFFFFF",
          dark: "#14171F",
        },
        hairline: {
          light: "#E2DFD7",
          dark: "#2A3042",
        },
        ink: {
          primary: "#111315",
          secondary: "#5A5D63",
          tertiary: "#8C8F96",
        },
        epistemic: {
          fact: "#059669",
          factBg: "#ECFDF5",
          factBorder: "#A7F3D0",
          hypo: "#4F46E5",
          hypoBg: "#EEF2FF",
          hypoBorder: "#C7D2FE",
        },
      },
      fontFamily: {
        serif: ["Newsreader", "Georgia", "serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["Geist Mono", "JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        tactile: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
        drawer: "-8px 0 24px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};
