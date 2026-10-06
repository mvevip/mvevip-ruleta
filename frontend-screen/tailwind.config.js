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
          DEFAULT: '#9AC31C',
          light: '#B2DC2B',
          dark: '#84A816',
          bg: '#0F1604'
        },
        racing: {
          red: '#DC2626',
          gold: '#F59E0B',
          dark: '#0A0A0C',
          carbon: '#141418',
          cyan: '#06B6D4'
        }
      },
      fontFamily: {
        racing: ['"Orbitron"', 'sans-serif'],
        sans: ['"Montserrat"', 'sans-serif']
      },
      boxShadow: {
        'brand': '0 0 25px rgba(154, 195, 28, 0.6)',
        'brand-lg': '0 0 45px rgba(154, 195, 28, 0.85)',
      }
    },
  },
  plugins: [],
}
