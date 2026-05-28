import path from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function normalizeBasePath(rawBase: string | undefined): string {
  const fallback = '/'
  if (!rawBase || rawBase.trim() === '') {
    return fallback
  }
  let base = rawBase.trim()
  if (!base.startsWith('/')) {
    base = `/${base}`
  }
  if (!base.endsWith('/')) {
    base = `${base}/`
  }
  return base
}

/**
 * Browser hits Vite; these paths forward to Flask (`VITE_FLASK_ORIGIN`).
 * - `/api`, `/oauth` — APIs and OAuth pages
 * - `/upload` — uploaded files (e.g. avatars stored as `upload/avatar/…` in JSON → requested as `/upload/avatar/…`)
 */
function flaskDevProxy(target: string): Record<string, { target: string; changeOrigin: boolean }> {
  const opts = { target, changeOrigin: true as const }
  return {
    '/api': opts,
    '/oauth': opts,
    '/upload': opts,
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const flaskOrigin = env.VITE_FLASK_ORIGIN ?? 'http://127.0.0.1:8077'
  const base = mode === 'production' ? normalizeBasePath(env.VITE_BASE_URL) : '/'
  const proxy = flaskDevProxy(flaskOrigin)

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
      proxy,
    },
    preview: {
      proxy,
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
