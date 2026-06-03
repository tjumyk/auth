/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FLASK_ORIGIN?: string
  /**
   * App mount path (router, API, uploads). Must match SITE.base_url in backend config.json.
   * Distinct from Vite `BASE_URL`, which also includes VITE_STATIC_PATH for hashed assets.
   */
  readonly VITE_SITE_BASE_URL?: string
  /**
   * Production-only extra segment before hashed assets (e.g. `static/` when Flask serves
   * `static/browser` at `/static/…`). Leave empty for Docker/nginx (assets at document root).
   */
  readonly VITE_STATIC_PATH?: string
  /** Optional build-time override; takes precedence over config.json SITE.name. */
  readonly VITE_SITE_NAME?: string
  /** Optional build-time override; takes precedence over config.json SITE.organization_name. */
  readonly VITE_SITE_ORGANIZATION_NAME?: string
  /** Optional build-time override; takes precedence over config.json SITE.group_name. */
  readonly VITE_SITE_GROUP_NAME?: string
  /** Optional build-time override; takes precedence over config.json SITE.copyright. */
  readonly VITE_SITE_COPYRIGHT?: string
  /** Dev only: extra milliseconds after each API response (success or error) for slow-network UX debugging. */
  readonly VITE_DEV_API_DELAY_MS?: string
  /** Optional build-time override; takes precedence over config.json UI.force_theme. */
  readonly VITE_FORCE_THEME?: string
  /** Optional build-time override; takes precedence over config.json UI.force_locale. */
  readonly VITE_FORCE_LOCALE?: string
  /** Optional build-time override; takes precedence over config.json MAIL.enabled. Root MAIL_ENABLED is mapped here in vite.config. */
  readonly VITE_MAIL_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
