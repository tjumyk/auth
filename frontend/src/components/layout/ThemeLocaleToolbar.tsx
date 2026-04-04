import {
  Box,
  Group,
  SegmentedControl,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'
import { IconMoon, IconSun } from '@tabler/icons-react'

import { useI18n } from '@/hooks/useI18n'

export function ThemeLocaleToolbar(): React.ReactElement {
  const { t, locale, setLocale } = useI18n()
  const { setColorScheme } = useMantineColorScheme()
  const computedColorScheme = useComputedColorScheme('light')

  return (
    <Group gap="sm" wrap="nowrap">
      <SegmentedControl
        size="xs"
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
      <SegmentedControl
        size="xs"
        value={locale}
        onChange={(v) => setLocale(v as 'en' | 'zh-Hans')}
        data={[
          { label: t('langZh'), value: 'zh-Hans' },
          { label: t('langEn'), value: 'en' },
        ]}
      />
    </Group>
  )
}
