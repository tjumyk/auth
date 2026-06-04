import path from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

import {
  resolveAppBaseFromEnv,
  resolveAssetBaseFromEnv,
} from './src/utils/pathBases'

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

/** Normalize app base from env and inject for builds that only set SITE_BASE_URL at repo root. */
function buildAppBaseDefine(env: Record<string, string>): Record<string, string> {
  return {
    'import.meta.env.VITE_SITE_BASE_URL': JSON.stringify(resolveAppBaseFromEnv(env)),
  }
}

/** Map MAIL_ENABLED (or VITE_MAIL_ENABLED) into import.meta.env.VITE_MAIL_ENABLED. */
function buildMailEnvDefines(env: Record<string, string>): Record<string, string> {
  if ('VITE_MAIL_ENABLED' in env || 'MAIL_ENABLED' in env) {
    return {
      'import.meta.env.VITE_MAIL_ENABLED': JSON.stringify(
        env.VITE_MAIL_ENABLED ?? env.MAIL_ENABLED ?? '',
      ),
    }
  }
  return {}
}

function flaskDevProxy(
  target: string,
  captchaTarget: string,
  appBase: string,
): Record<string, { target: string; changeOrigin: boolean }> {
  const opts = { target, changeOrigin: true as const }
  const captchaOpts = { target: captchaTarget, changeOrigin: true as const }
  if (appBase === '/') {
    return {
      '/api/captcha': captchaOpts,
      '/api': opts,
      '/oauth': opts,
      '/upload': opts,
    }
  }
  const prefix = appBase.replace(/\/+$/, '')
  return {
    [`${prefix}/api/captcha`]: captchaOpts,
    [`${prefix}/api`]: opts,
    [`${prefix}/oauth`]: opts,
    [`${prefix}/upload`]: opts,
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadMergedEnv(mode)
  const flaskOrigin = env.VITE_FLASK_ORIGIN ?? 'http://127.0.0.1:8077'
  const captchaOrigin = env.VITE_CAPTCHA_ORIGIN ?? 'http://127.0.0.1:8090'
  const appBase = resolveAppBaseFromEnv(env)
  const base = resolveAssetBaseFromEnv(env, { production: mode === 'production' })
  const proxy = flaskDevProxy(flaskOrigin, captchaOrigin, appBase)

  return {
    plugins: [react()],
    define: {
      ...buildSiteEnvDefines(env),
      ...buildAppBaseDefine(env),
      ...buildMailEnvDefines(env),
    },
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
