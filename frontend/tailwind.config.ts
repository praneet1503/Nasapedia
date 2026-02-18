import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
          void: '#06080f',
          deep: '#0a0e1a',
          mid: '#111827',
          surface: '#1a1f2e',
          elevated: '#232a3b',
        },
        accent: {
          DEFAULT: '#00d4ff',
          dim: '#0ea5e9',
        },
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(0, 212, 255, 0.15)',
        'glow-md': '0 0 20px rgba(0, 212, 255, 0.25)',
        'glow-lg': '0 0 40px rgba(0, 212, 255, 0.3)',
      },
    },
  },
  plugins: [],
} satisfies Config
