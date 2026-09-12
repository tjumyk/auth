import { Box, Group, SegmentedControl, Stack, useMantineColorScheme } from '@mantine/core'
import { IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react'
import type { ReactNode } from 'react'

import { useI18n } from '@/hooks/useI18n'
import { isLocaleForced, isThemeForced } from '@/models/uiConfig'

function ThemeOptionLabel({
  label,
  children,
}: {
  label: string
  children: ReactNode
}): React.ReactElement {
  return (
    <Box
      component="span"
      display="flex"
      title={label}
      aria-label={label}
      style={{ alignItems: 'center', justifyContent: 'center' }}
    >
      {children}
    </Box>
  )
}

export function ThemeLocaleToolbar({
  variant = 'inline',
}: {
  /** `menu`: vertical, full-width — for account dropdown on narrow screens. */
  variant?: 'inline' | 'menu'
}): React.ReactElement | null {
  const { t, locale, setLocale } = useI18n()
  const { colorScheme, setColorScheme } = useMantineColorScheme()

  const themeControl = (
    <SegmentedControl
      size="xs"
      fullWidth={variant === 'menu'}
      value={colorScheme}
      onChange={(v) => setColorScheme(v as 'light' | 'dark' | 'auto')}
      data={[
        {
          label: (
            <ThemeOptionLabel label={t('themeLight')}>
              <IconSun size={16} />
            </ThemeOptionLabel>
          ),
          value: 'light',
        },
        {
          label: (
            <ThemeOptionLabel label={t('themeAuto')}>
              <IconDeviceDesktop size={16} />
            </ThemeOptionLabel>
          ),
          value: 'auto',
        },
        {
          label: (
            <ThemeOptionLabel label={t('themeDark')}>
              <IconMoon size={16} />
            </ThemeOptionLabel>
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
