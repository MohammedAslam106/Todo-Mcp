import type { Config } from 'tailwindcss'

export default {
  content: ['./client/index.html', './client/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
