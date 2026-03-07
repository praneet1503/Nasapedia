import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
          void: '#0c0a04',
          deep: '#141008',
          mid: '#1a1610',
          surface: '#221e10',
          elevated: '#2e2818',
        },
        accent: {
          DEFAULT: '#f2c40d',
          dim: '#d4a80a',
        },
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(242, 196, 13, 0.15)',
        'glow-md': '0 0 20px rgba(242, 196, 13, 0.25)',
        'glow-lg': '0 0 40px rgba(242, 196, 13, 0.3)',
      },
    },
  },
  plugins: [],
} satisfies Config
