import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Group, Modal, Stack, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { ADMIN_OAUTH_CLIENTS_QK, postAdminOAuthClient } from '@/api/admin'
import { getBasicErrorFromUnknown } from '@/api/client'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'

export function AdminOAuthClientNewModal({
  opened,
  onClose,
}: {
  opened: boolean
  onClose: () => void
}): React.ReactElement {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<BasicError | null>(null)

  const form = useForm({
    initialValues: {
      name: '',
      redirect_url: '',
      home_url: '',
      description: '',
    },
    validate: {
      name: (v) => (v.trim().length > 0 ? null : t('fieldRequired')),
      redirect_url: (v) => (v.trim().length > 0 ? null : t('fieldRequired')),
      home_url: (v) => (v.trim().length > 0 ? null : t('fieldRequired')),
    },
  })

  useEffect(() => {
    if (!opened) {
      form.reset()
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened])

  const m = useMutation({
    mutationFn: () =>
      postAdminOAuthClient({
        name: form.values.name.trim(),
        redirect_url: form.values.redirect_url.trim(),
        home_url: form.values.home_url.trim(),
        description: form.values.description.trim(),
      }),
    onSuccess: (c) => {
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ADMIN_OAUTH_CLIENTS_QK })
      form.reset()
      onClose()
      navigate(`/admin/oauth/clients/c/${c.id}`)
    },
    onError: (e) => setError(getBasicErrorFromUnknown(e)),
  })

  return (
    <Modal opened={opened} onClose={onClose} title={t('adminTitleNewOAuthClient')} size="lg">
      {error ? (
        <Alert color="red" title={error.msg} onClose={() => setError(null)} withCloseButton mb="md">
          {error.detail}
        </Alert>
      ) : null}

      <form
        onSubmit={form.onSubmit(() => {
          m.mutate()
        })}
      >
        <Stack gap="md" key={locale}>
          <TextInput label={t('adminOAuthFieldName')} required {...form.getInputProps('name')} />
          <TextInput
            label={t('adminOAuthFieldHomeUrl')}
            required
            {...form.getInputProps('home_url')}
          />
          <TextInput
            label={t('adminOAuthFieldRedirectUrl')}
            required
            {...form.getInputProps('redirect_url')}
          />
          <TextInput label={t('adminOAuthFieldDescription')} {...form.getInputProps('description')} />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" type="button" onClick={onClose}>
              {t('back')}
            </Button>
            <Button type="submit" loading={m.isPending}>
              {t('adminOAuthCreate')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
