import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Checkbox, Group, Modal, Select, Stack, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useEffect, useState } from 'react'

import { ADMIN_USERS_QK, postAdminInviteUser, type AdminInviteResult } from '@/api/admin'
import { fetchExternalAuthProviders } from '@/api/account'
import { getBasicErrorFromUnknown } from '@/api/client'
import { ConfirmEmailUrlField } from '@/components/admin/ConfirmEmailUrlField'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'
import { mailEnabled } from '@/models/mailConfig'
import { EMAIL_MAX_LENGTH, isValidEmail } from '@/utils/emailValidation'

export function AdminUserInviteModal({
  opened,
  onClose,
}: {
  opened: boolean
  onClose: () => void
}): React.ReactElement {
  const { t, locale } = useI18n()
  const queryClient = useQueryClient()
  const [error, setError] = useState<BasicError | null>(null)
  const [inviteResult, setInviteResult] = useState<AdminInviteResult | null>(null)

  const providersQ = useQuery({
    queryKey: ['externalAuthProviders'],
    queryFn: fetchExternalAuthProviders,
    enabled: opened,
  })

  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      external_auth_provider_id: '' as string | null,
      skip_email_confirmation: false,
    },
    validate: {
      name: (v) => {
        const s = v.trim()
        if (s.length < 3) return t('registerNameMin')
        if (s.length > 16) return t('registerNameMax')
        if (!/^[\w]{3,16}$/.test(s)) return t('registerNamePattern')
        return null
      },
      email: (v) => {
        const s = v.trim()
        if (!s) return t('registerEmailRequired')
        if (s.length > EMAIL_MAX_LENGTH) return t('registerEmailMax')
        if (!isValidEmail(s)) return t('registerEmailInvalid')
        return null
      },
    },
  })

  useEffect(() => {
    if (!opened) {
      form.reset()
      setError(null)
      setInviteResult(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when modal closes
  }, [opened])

  const inviteM = useMutation({
    mutationFn: () => {
      const ext = form.values.external_auth_provider_id
      return postAdminInviteUser({
        name: form.values.name.trim(),
        email: form.values.email.trim(),
        external_auth_provider_id: ext && ext.length > 0 ? ext : undefined,
        skip_email_confirmation: Boolean(ext) && form.values.skip_email_confirmation,
      })
    },
    onSuccess: (result) => {
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QK })
      if (result.confirm_email_url) {
        setInviteResult(result)
        return
      }
      form.reset()
      setInviteResult(null)
      onClose()
    },
    onError: (err) => {
      setError(getBasicErrorFromUnknown(err))
    },
  })

  const providerOptions =
    providersQ.data?.map((p) => ({ value: p.id, label: p.name })) ?? []
  const showProviderFields = (providersQ.data?.length ?? 0) > 0

  const handleDone = (): void => {
    form.reset()
    setInviteResult(null)
    onClose()
  }

  if (inviteResult?.confirm_email_url) {
    return (
      <Modal opened={opened} onClose={handleDone} title={t('adminTitleInviteUser')} size="md">
        <Stack gap="md">
          <Alert color="green" title={t('adminInviteConfirmUrlTitle')}>
            {t('adminBatchStatusInvited')}
          </Alert>
          <ConfirmEmailUrlField
            url={inviteResult.confirm_email_url}
            hint={!mailEnabled ? t('mailDisabledConfirmUrlHint') : undefined}
          />
          <Group justify="flex-end">
            <Button onClick={handleDone}>{t('back')}</Button>
          </Group>
        </Stack>
      </Modal>
    )
  }

  return (
    <Modal opened={opened} onClose={onClose} title={t('adminTitleInviteUser')} size="md">
      {error ? (
        <Alert color="red" title={error.msg} onClose={() => setError(null)} withCloseButton mb="md">
          {error.detail}
        </Alert>
      ) : null}

      <form
        onSubmit={form.onSubmit(() => {
          inviteM.mutate()
        })}
      >
        <Stack gap="md" key={locale}>
          <TextInput label={t('registerUsernameLabel')} required {...form.getInputProps('name')} />
          <TextInput
            label={t('registerEmailLabel')}
            type="email"
            required
            {...form.getInputProps('email')}
          />
          {showProviderFields ? (
            <>
              <Select
                label={t('adminInviteAuthProvider')}
                placeholder={t('adminInviteAuthProviderLocal')}
                clearable
                data={providerOptions}
                value={form.values.external_auth_provider_id || null}
                onChange={(v) => form.setFieldValue('external_auth_provider_id', v)}
              />
              {form.values.external_auth_provider_id ? (
                <Checkbox
                  label={t('adminInviteSkipEmailConfirmation')}
                  {...form.getInputProps('skip_email_confirmation', { type: 'checkbox' })}
                />
              ) : null}
            </>
          ) : null}
          <Group justify="flex-end" mt="xs">
            <Button variant="default" type="button" onClick={onClose}>
              {t('back')}
            </Button>
            <Button type="submit" loading={inviteM.isPending}>
              {t('adminInviteSubmit')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
