/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Charte graphique BONJOUR IA
        bw: {
          pink: "#E83967",
          "pink-dark": "#c02d55",
          "pink-soft": "#f2d5d0",
          cloudy: "#B1ADA1",
          bg: "#F4F3EE",
          white: "#FFFFFF",
          text: "#2D2D2D",
          danger: "#c0392b",
        },
      },
      fontFamily: {
        heading: ["var(--font-poppins)", "Arial", "sans-serif"],
        body: ["var(--font-lora)", "Georgia", "serif"],
      },
      borderRadius: {
        bw: "12px",
      },
      boxShadow: {
        bw: "0 4px 20px rgba(232,57,103,0.08)",
      },
    },
  },
  plugins: [],
};
