/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FLASK_ORIGIN?: string
  /** Must match SITE.base_url in backend config.json; default "/" when unset. */
  readonly VITE_SITE_BASE_URL?: string
  /** Dev only: extra milliseconds after each API response (success or error) for slow-network UX debugging. */
  readonly VITE_DEV_API_DELAY_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
