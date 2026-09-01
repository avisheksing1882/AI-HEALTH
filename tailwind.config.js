/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#06080C',
          900: '#0B0F17',
          850: '#101522',
          800: '#161D2E',
          700: '#232D42',
          600: '#34415C',
        },
        health: {
          green: '#10B981',
          emerald: '#059669',
          glow: '#34D399',
          cyan: '#06B6D4',
          blue: '#3B82F6',
          purple: '#8B5CF6',
          orange: '#F97316',
          flame: '#EF4444',
          amber: '#F59E0B'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-green': '0 0 25px -5px rgba(16, 185, 129, 0.35)',
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.35)',
        'glow-orange': '0 0 25px -5px rgba(249, 115, 22, 0.35)',
        'glow-purple': '0 0 25px -5px rgba(139, 92, 246, 0.35)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan-laser': 'scan 2.5s ease-in-out infinite',
      },
      keyframes: {
        scan: {
          '0%, 100%': { top: '5%' },
          '50%': { top: '90%' },
        }
      }
    },
  },
  plugins: [],
}
