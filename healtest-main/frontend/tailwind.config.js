/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        brand: {
          deep: '#4C1A57',
          purple: '#4C1A57',
          mid: '#76518A',
          lavender: '#BAB0D4',
          50: '#faf7fc',
          100: '#f4eef9',
          200: '#e8ddf2',
          300: '#d5c4e6',
          400: '#BAB0D4',
          500: '#76518A',
          600: '#4C1A57',
          700: '#3c1445',
          800: '#2d0f34',
          900: '#1e0a23',
          gradient: 'linear-gradient(135deg, #4C1A57 0%, #76518A 50%, #BAB0D4 100%)',
        },
        heal: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
