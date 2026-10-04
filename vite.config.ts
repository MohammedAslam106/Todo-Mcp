import { resolve } from 'node:path'
import { defineConfig } from 'vite'

import viteReact from '@vitejs/plugin-react'
import viteFastifyReact from '@fastify/react/plugin'

export default defineConfig({
  root: resolve(import.meta.dirname, 'client'),
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'client'),
    },
  },
  plugins: [viteReact(), viteFastifyReact()],
  optimizeDeps: {
    // Skip index.html: its `$app/mount.js` is a virtual module the scanner
    // resolves to D:\$app\mount.js on Windows.
    entries: ['pages/**/*.{tsx,jsx}', 'layouts/**/*.{tsx,jsx}'],
  },
  ssr: {
    external: ['use-sync-external-store'],
  },
})
