/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bw: {
          bg: "#0f1115",
          panel: "#171a21",
          border: "#262b36",
          accent: "#5b8def",
          danger: "#ef5b5b",
        },
      },
    },
  },
  plugins: [],
};
