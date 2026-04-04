import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { I18nContext } from '@/i18n/context'
import { getDefaultLocale, STORAGE_KEY, translations } from '@/i18n/translations'
import type { I18nContextValue, Locale } from '@/i18n/types'

export function I18nProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [locale, setLocaleState] = useState<Locale>(getDefaultLocale)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string>) => {
      let s = translations[locale][key] ?? translations.en[key] ?? key
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replaceAll(`{${k}}`, v)
        }
      }
      return s
    },
    [locale],
  )

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
