/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Background scale (warm dark brown) ──────────────
        space: {
          950: "#120D0A",  // deepest ink — page background
          900: "#1A1410",  // neutral dark
          850: "#1C1510",  // panel surface
          800: "#221812",  // slightly lighter panel
          700: "#2E2018",  // border / divider
          600: "#44342A",  // hover surface / muted
        },
        // ── Accent scale (warm earthy palette) ──────────────
        accent: {
          primary:   "#FFDBBB",   // Primary  — peach cream (CTAs, active states)
          secondary: "#CCBEB1",   // Secondary — warm beige (secondary text/elements)
          tertiary:  "#997E67",   // Tertiary  — warm brown (labels, muted)
          positive:  "#8FAF8A",   // Positive  — muted sage green
          negative:  "#C47A6A",   // Negative  — warm clay red
          // legacy aliases kept for compatibility
          cyan:   "#FFDBBB",
          blue:   "#CCBEB1",
          amber:  "#997E67",
          teal:   "#8FAF8A",
          red:    "#C47A6A",
        },
      },
      fontFamily: {
        sans:    ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "Space Grotesk", "system-ui", "sans-serif"],
        label:   ["Space Grotesk", "system-ui", "sans-serif"],
        mono:    ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 1px 0 rgba(255,219,187,0.20), 0 10px 24px -12px rgba(18,13,10,0.7)",
      },
    },
  },
  plugins: [],
}
