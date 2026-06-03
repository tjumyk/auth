import { z } from 'zod'

import rawConfig from '../../../config.json'

const SiteSchema = z
  .object({
    name: z.string().optional(),
    organization_name: z.string().optional(),
    group_name: z.string().optional(),
    copyright: z.string().optional(),
  })
  .passthrough()

const RootConfigSchema = z
  .object({
    SITE: SiteSchema.optional(),
  })
  .passthrough()

const rootParsed = RootConfigSchema.safeParse(rawConfig)
const site = rootParsed.success ? rootParsed.data.SITE : undefined

/** Sentinel from docker-compose when a SITE_* var is absent from .env (see ${VAR-__UNSET__}). */
const UNSET_ENV_SENTINEL = '__UNSET__'

function normalizeSiteEnvValue(value: string | undefined): string | undefined {
  if (value === undefined || value === UNSET_ENV_SENTINEL) {
    return undefined
  }
  return value
}

export function resolveSiteName(envValue: string | undefined, configValue: string | undefined): string {
  const normalized = normalizeSiteEnvValue(envValue)
  if (normalized !== undefined) {
    const trimmed = normalized.trim()
    return trimmed || 'Identity'
  }
  return configValue?.trim() || 'Identity'
}

export function resolveSiteOptionalString(
  envValue: string | undefined,
  configValue: string | undefined,
): string {
  const normalized = normalizeSiteEnvValue(envValue)
  if (normalized !== undefined) {
    return normalized.trim()
  }
  return configValue?.trim() ?? ''
}

export const siteConfig = {
  name: resolveSiteName(import.meta.env.VITE_SITE_NAME, site?.name),
  organizationName: resolveSiteOptionalString(
    import.meta.env.VITE_SITE_ORGANIZATION_NAME,
    site?.organization_name,
  ),
  groupName: resolveSiteOptionalString(import.meta.env.VITE_SITE_GROUP_NAME, site?.group_name),
  copyright: resolveSiteOptionalString(import.meta.env.VITE_SITE_COPYRIGHT, site?.copyright),
}
