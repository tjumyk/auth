import { Button, Checkbox, PasswordInput, Stack, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'

import { useI18n } from '@/hooks/useI18n'

export type LoginFormValues = {
  name_or_email: string
  password: string
  remember: boolean
}

export function LoginForm({
  onSubmit,
  loading,
}: {
  onSubmit: (values: LoginFormValues) => void
  loading: boolean
}): React.ReactElement {
  const { t } = useI18n()
  const form = useForm<LoginFormValues>({
    initialValues: {
      name_or_email: '',
      password: '',
      remember: false,
    },
    validate: {
      name_or_email: (v) => (v.trim().length > 0 ? null : t('fieldRequired')),
      password: (v) => (v.length > 0 ? null : t('fieldRequired')),
    },
  })

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        onSubmit(values)
      })}
    >
      <Stack gap="md">
        <TextInput label={t('usernameOrEmail')} required {...form.getInputProps('name_or_email')} />
        <PasswordInput label={t('password')} required {...form.getInputProps('password')} />
        <Checkbox label={t('rememberMe')} {...form.getInputProps('remember', { type: 'checkbox' })} />
        <Button type="submit" loading={loading} fullWidth>
          {t('signInSubmit')}
        </Button>
      </Stack>
    </form>
  )
}
