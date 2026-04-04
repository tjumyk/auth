import path from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const flaskOrigin = env.VITE_FLASK_ORIGIN ?? 'http://127.0.0.1:8077'
  const base = mode === 'production' ? '/static/' : '/'

  return {
    plugins: [react()],
    base,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      fs: {
        allow: [path.resolve(__dirname, '..')],
      },
      proxy: {
        '/api': { target: flaskOrigin, changeOrigin: true },
        '/oauth': { target: flaskOrigin, changeOrigin: true },
      },
    },
    build: {
      outDir: '../static/browser',
      emptyOutDir: true,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  }
})
