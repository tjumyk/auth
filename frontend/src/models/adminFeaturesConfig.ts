import { z } from 'zod'

import rawConfig from '../../../config.json'

const ExternalUserInfoSourceSchema = z
  .object({
    type: z.string().optional(),
  })
  .passthrough()

const RootConfigSchema = z
  .object({
    EXTERNAL_USER_INFO: z.array(ExternalUserInfoSourceSchema).optional(),
  })
  .passthrough()

const rootParsed = RootConfigSchema.safeParse(rawConfig)

function hasExternalUserInfoSources(sources: unknown): boolean {
  if (!Array.isArray(sources) || sources.length === 0) {
    return false
  }
  return sources.some((entry) => {
    const parsed = ExternalUserInfoSourceSchema.safeParse(entry)
    return parsed.success && Boolean(parsed.data.type?.trim())
  })
}

/** True when `config.json` defines at least one external user info source (e.g. pwd_agent). */
export const externalUserInfoEnabled = hasExternalUserInfoSources(
  rootParsed.success ? rootParsed.data.EXTERNAL_USER_INFO : undefined,
)
