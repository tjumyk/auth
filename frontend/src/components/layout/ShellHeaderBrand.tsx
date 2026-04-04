import { Box, Group, Stack, Text } from '@mantine/core'
import { type ReactNode } from 'react'
import { Link } from 'react-router'

import { SiteLogoImage } from '@/components/branding/SiteLogoImage'
import { useI18n } from '@/hooks/useI18n'
import { siteConfig } from '@/models/siteConfig'

export function ShellHeaderBrand({
  before,
  to = '/',
  subline,
  onNavigate,
}: {
  before?: ReactNode
  to?: string
  subline?: string
  onNavigate?: () => void
}): React.ReactElement {
  const { t } = useI18n()
  return (
    <Group gap="sm" wrap="nowrap" align="center" style={{ minWidth: 0 }}>
      {before}
      <Box
        component={Link}
        to={to}
        onClick={onNavigate}
        aria-label={t('goHome')}
        style={{ minWidth: 0, textDecoration: 'none', color: 'inherit' }}
      >
        <Group gap="sm" wrap="nowrap" align="center" style={{ minWidth: 0 }}>
          <SiteLogoImage placement="header" />
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text fw={600} lineClamp={1} lh={1.25} style={{ minWidth: 0 }}>
              {siteConfig.name}
            </Text>
            {subline ? (
              <Text size="xs" c="dimmed" lineClamp={1} lh={1.2} style={{ minWidth: 0 }}>
                {subline}
              </Text>
            ) : null}
          </Stack>
        </Group>
      </Box>
    </Group>
  )
}
