import { Button, Container, Group, Stack, Text, Title } from '@mantine/core'
import { useDocumentTitle } from '@mantine/hooks'
import { IconLockX } from '@tabler/icons-react'
import { Link } from 'react-router'

import { ThemeLocaleToolbar } from '@/components/layout/ThemeLocaleToolbar'
import { useI18n } from '@/hooks/useI18n'
import { isThemeLocaleToolbarVisible } from '@/models/uiConfig'
import { siteConfig } from '@/models/siteConfig'

export function ForbiddenPage(): React.ReactElement {
  const { t } = useI18n()
  useDocumentTitle(`${siteConfig.name} · ${t('forbiddenPageTitle')}`)

  return (
    <Container size="sm" py="xl">
      {isThemeLocaleToolbarVisible ? (
        <Group justify="flex-end" mb="md">
          <ThemeLocaleToolbar />
        </Group>
      ) : null}
      <Stack gap="lg" align="center" ta="center">
        <IconLockX size={48} stroke={1.25} aria-hidden />
        <Title order={2}>{t('forbiddenHeading')}</Title>
        <Text c="dimmed">{t('forbiddenMessage')}</Text>
        <Button component={Link} to="/" variant="light">
          {t('goHome')}
        </Button>
      </Stack>
    </Container>
  )
}
