import path from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const SITE_ENV_SUFFIXES = ['NAME', 'ORGANIZATION_NAME', 'GROUP_NAME', 'COPYRIGHT'] as const

function loadMergedEnv(mode: string): Record<string, string> {
  return { ...loadEnv(mode, repoRoot, ''), ...loadEnv(mode, process.cwd(), '') }
}

/** Map root SITE_* (or VITE_SITE_*) into import.meta.env for local dev and non-Docker builds. */
function buildSiteEnvDefines(env: Record<string, string>): Record<string, string> {
  const defines: Record<string, string> = {}
  for (const suffix of SITE_ENV_SUFFIXES) {
    const viteKey = `VITE_SITE_${suffix}`
    const siteKey = `SITE_${suffix}`
    if (viteKey in env || siteKey in env) {
      defines[`import.meta.env.${viteKey}`] = JSON.stringify(env[viteKey] ?? env[siteKey] ?? '')
    }
  }
  return defines
}

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

function flaskDevProxy(
  target: string,
  basePath: string,
): Record<string, { target: string; changeOrigin: boolean }> {
  const opts = { target, changeOrigin: true as const }
  const prefix = basePath === '/' ? '' : basePath.replace(/\/+$/, '')
  return {
    [`${prefix}/api`]: opts,
    [`${prefix}/oauth`]: opts,
    [`${prefix}/upload`]: opts,
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadMergedEnv(mode)
  const flaskOrigin = env.VITE_FLASK_ORIGIN ?? 'http://127.0.0.1:8077'
  const base = mode === 'production' ? normalizeBasePath(env.VITE_BASE_URL) : '/'
  const proxy = flaskDevProxy(flaskOrigin, base)

  return {
    plugins: [react()],
    define: buildSiteEnvDefines(env),
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
