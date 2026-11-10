/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
        },
        trade: '#ea580c',
        legal: '#4f46e5',
        transit: '#059669',
        tech: '#0284c7',
        health: '#e11d48',
      }
    },
  },
  plugins: [],
}
