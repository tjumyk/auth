import { createContext } from 'react'

import type { I18nContextValue } from '@/i18n/types'

export const I18nContext = createContext<I18nContextValue | null>(null)
