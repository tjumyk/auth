import { z } from 'zod'

import rawConfig from '../../../config.json'

const UNSET_ENV_SENTINEL = '__UNSET__'

const MailSchema = z
  .object({
    enabled: z.boolean().optional(),
  })
  .passthrough()

const RootConfigSchema = z
  .object({
    MAIL: MailSchema.optional(),
  })
  .passthrough()

const rootParsed = RootConfigSchema.safeParse(rawConfig)
const mail = rootParsed.success ? rootParsed.data.MAIL : undefined

function normalizeMailEnvValue(value: string | undefined): string | undefined {
  if (value === undefined || value === UNSET_ENV_SENTINEL) {
    return undefined
  }
  return value
}

function parseBooleanString(value: string): boolean | null {
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 't', 'yes', 'y', 'on'].includes(normalized)) {
    return true
  }
  if (['0', 'false', 'f', 'no', 'n', 'off'].includes(normalized)) {
    return false
  }
  return null
}

export function resolveMailEnabled(
  envValue: string | undefined,
  configValue: boolean | undefined,
): boolean {
  const normalized = normalizeMailEnvValue(envValue)
  if (normalized !== undefined) {
    const parsed = parseBooleanString(normalized)
    if (parsed !== null) {
      return parsed
    }
  }
  return configValue ?? true
}

export const mailEnabled = resolveMailEnabled(
  import.meta.env.VITE_MAIL_ENABLED,
  mail?.enabled,
)
