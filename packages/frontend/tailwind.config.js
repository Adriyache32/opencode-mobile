/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e0eaff',
          200: '#c7d9ff',
          300: '#a0bfff',
          400: '#7a9eff',
          500: '#5a7eff',
          600: '#4361ee',
          700: '#374fd8',
          800: '#3142aa',
          900: '#2d3b8a'
        },
        dark: {
          bg: '#0f0f1a',
          surface: '#1a1a2e',
          border: '#2a2a4a',
          text: '#e8e8f0',
          muted: '#8a8ab8'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    }
  },
  darkMode: 'class',
  plugins: []
};