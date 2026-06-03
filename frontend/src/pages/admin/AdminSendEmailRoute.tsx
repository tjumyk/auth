import { Alert, Container, Stack, Text, Title } from '@mantine/core'
import { AdminSendEmailPage } from '@/pages/admin/AdminSendEmailPage'
import { useI18n } from '@/hooks/useI18n'
import { mailEnabled } from '@/models/mailConfig'

export function AdminSendEmailRoute(): React.ReactElement {
  const { t } = useI18n()

  if (!mailEnabled) {
    return (
      <Container size="sm" py="xl">
        <Stack gap="md">
          <Title order={2}>{t('adminTitleSendEmail')}</Title>
          <Alert color="yellow" title={t('requestReconfirmUnavailableTitle')}>
            <Text size="sm">{t('requestReconfirmUnavailableBody')}</Text>
          </Alert>
        </Stack>
      </Container>
    )
  }

  return <AdminSendEmailPage />
}
