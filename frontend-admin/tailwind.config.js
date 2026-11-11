/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sistema de diseño claro del Admin (ver docs/admin_design_system.md)
        canvas: '#F4F7FB',
        surface: { DEFAULT: '#FFFFFF', 2: '#F8FAFC' },
        line: { DEFAULT: '#E2E8F0', strong: '#CBD5E1' },
        ink: { DEFAULT: '#0F172A', 2: '#334155', muted: '#64748B' },
        navy: { DEFAULT: '#0B2A4A', 700: '#12385F', soft: '#E7EEF6' },
        brand: {
          DEFAULT: '#9AC31C',
          light: '#B2DC2B',
          dark: '#5F7D0C',
          600: '#84A816',
          soft: '#F0F7DA',
          bg: '#0F1604'
        },
        racing: {
          red: '#DC2626',
          dark: '#0A0A0C',
          carbon: '#141418'
        }
      },
      fontFamily: {
        racing: ['"Orbitron"', 'sans-serif'],
        sans: ['"Montserrat"', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.06)',
        pop: '0 10px 40px rgba(15,23,42,0.18)'
      }
    },
  },
  plugins: [],
}
