import { Button, Container, Group, Stack, Text, Title } from '@mantine/core'
import { useDocumentTitle } from '@mantine/hooks'
import { Link } from 'react-router'

import { ThemeLocaleToolbar } from '@/components/layout/ThemeLocaleToolbar'
import { useI18n } from '@/hooks/useI18n'
import { isThemeLocaleToolbarVisible } from '@/models/uiConfig'

export function NotFoundPage(): React.ReactElement {
  const { t } = useI18n()
  useDocumentTitle(t('notFoundPageTitle'))

  return (
    <Container size="sm" py="xl">
      {isThemeLocaleToolbarVisible ? (
        <Group justify="flex-end" mb="md">
          <ThemeLocaleToolbar />
        </Group>
      ) : null}
      <Stack gap="md">
        <Title order={2}>{t('notFoundHeading')}</Title>
        <Text c="dimmed">{t('notFoundMessage')}</Text>
        <Button component={Link} to="/" variant="light">
          {t('goHome')}
        </Button>
      </Stack>
    </Container>
  )
}
