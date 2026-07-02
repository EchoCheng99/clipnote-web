/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EFEBE1",
        card: "#F8F5ED",
        card2: "#F1EDE1",
        ink: "#22282E",
        inksoft: "#6b6355",
        inkfaint: "#948c7a",
        highlight: "#F4C744",
        highlightsoft: "#FCE9AE",
        redpen: "#AD3B34",
        redpensoft: "#F3DAD6",
        teal: "#2F6B5E",
        tealsoft: "#DCE9E2",
        line: "#D8D2C2",
        linestrong: "#C3BBA5"
      },
      fontFamily: {
        serif: ["'Noto Serif SC'", "serif"],
        voice: ["'Source Serif 4'", "serif"],
        sans: ["'Noto Sans SC'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"]
      }
    }
  },
  plugins: []
};
