import { Group, Text } from '@mantine/core'
import { Link } from 'react-router'

import { useI18n } from '@/hooks/useI18n'
import { mailEnabled } from '@/models/mailConfig'

export function LoginFooterLinks(): React.ReactElement {
  const { t } = useI18n()
  return (
    <Group gap="xs" justify="center" mt="xs" wrap="wrap">
      <Text component={Link} to="/account/request-reconfirm-email" size="sm" c="dimmed">
        {t('loginFooterReconfirmEmail')}
      </Text>
      <Text span size="sm" c="dimmed" aria-hidden>
        ·
      </Text>
      <Text component={Link} to="/account/request-reset-password" size="sm" c="dimmed">
        {t('loginFooterResetPassword')}
      </Text>
      {mailEnabled ? (
        <>
          <Text span size="sm" c="dimmed" aria-hidden>
            ·
          </Text>
          <Text component={Link} to="/account/register" size="sm" c="dimmed">
            {t('loginFooterSignUp')}
          </Text>
        </>
      ) : null}
    </Group>
  )
}
