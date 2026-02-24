/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/sidepanel/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
