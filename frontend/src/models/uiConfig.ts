import { z } from 'zod'

import rawConfig from '../../../config.json'
import type { Locale } from '@/i18n/types'

const ForcedThemeSchema = z.enum(['light', 'dark'])
const ForcedLocaleSchema = z.enum(['en', 'zh-Hans'])

const UiSchema = z
  .object({
    force_theme: ForcedThemeSchema.optional(),
    force_locale: ForcedLocaleSchema.optional(),
  })
  .passthrough()

const RootConfigSchema = z
  .object({
    UI: UiSchema.optional(),
  })
  .passthrough()

export type ForcedColorScheme = z.infer<typeof ForcedThemeSchema>
export type ForcedLocale = Locale

function parseForcedValue<T extends string>(
  schema: z.ZodType<T>,
  envValue: string | undefined,
  configValue: unknown,
): T | null {
  const fromEnv = envValue?.trim()
  const envParsed = schema.safeParse(fromEnv)
  if (envParsed.success) {
    return envParsed.data
  }
  const configParsed = schema.safeParse(configValue)
  if (configParsed.success) {
    return configParsed.data
  }
  return null
}

export function parseForcedTheme(
  envValue: string | undefined,
  configValue: unknown,
): ForcedColorScheme | null {
  return parseForcedValue(ForcedThemeSchema, envValue, configValue)
}

export function parseForcedLocale(
  envValue: string | undefined,
  configValue: unknown,
): ForcedLocale | null {
  return parseForcedValue(ForcedLocaleSchema, envValue, configValue)
}

const rootParsed = RootConfigSchema.safeParse(rawConfig)
const ui = rootParsed.success ? rootParsed.data.UI : undefined

export const forcedColorScheme = parseForcedTheme(import.meta.env.VITE_FORCE_THEME, ui?.force_theme)
export const forcedLocale = parseForcedLocale(import.meta.env.VITE_FORCE_LOCALE, ui?.force_locale)

export const isThemeForced = forcedColorScheme !== null
export const isLocaleForced = forcedLocale !== null
export const isThemeLocaleToolbarVisible = !isThemeForced || !isLocaleForced
