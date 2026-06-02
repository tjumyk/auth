import {
  Box,
  Group,
  SegmentedControl,
  Stack,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'
import { IconMoon, IconSun } from '@tabler/icons-react'

import { useI18n } from '@/hooks/useI18n'
import { isLocaleForced, isThemeForced } from '@/models/uiConfig'

export function ThemeLocaleToolbar({
  variant = 'inline',
}: {
  /** `menu`: vertical, full-width — for account dropdown on narrow screens. */
  variant?: 'inline' | 'menu'
}): React.ReactElement {
  const { t, locale, setLocale } = useI18n()
  const { setColorScheme } = useMantineColorScheme()
  const computedColorScheme = useComputedColorScheme('light')

  const themeControl = (
    <SegmentedControl
      size="xs"
      fullWidth={variant === 'menu'}
      value={computedColorScheme}
      onChange={(v) => setColorScheme(v as 'light' | 'dark')}
      data={[
        {
          label: (
            <Box
              component="span"
              display="flex"
              style={{ alignItems: 'center', justifyContent: 'center' }}
            >
              <IconSun size={16} />
            </Box>
          ),
          value: 'light',
        },
        {
          label: (
            <Box
              component="span"
              display="flex"
              style={{ alignItems: 'center', justifyContent: 'center' }}
            >
              <IconMoon size={16} />
            </Box>
          ),
          value: 'dark',
        },
      ]}
    />
  )

  const localeControl = (
    <SegmentedControl
      size="xs"
      fullWidth={variant === 'menu'}
      value={locale}
      onChange={(v) => setLocale(v as 'en' | 'zh-Hans')}
      data={[
        { label: t('langZh'), value: 'zh-Hans' },
        { label: t('langEn'), value: 'en' },
      ]}
    />
  )

  const showTheme = !isThemeForced
  const showLocale = !isLocaleForced

  if (!showTheme && !showLocale) {
    return null
  }

  if (variant === 'menu') {
    return (
      <Stack gap={6} w="100%">
        {showTheme ? themeControl : null}
        {showLocale ? localeControl : null}
      </Stack>
    )
  }

  return (
    <Group gap="sm" wrap="nowrap">
      {showTheme ? themeControl : null}
      {showLocale ? localeControl : null}
    </Group>
  )
}
