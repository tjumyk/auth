import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Group, Modal, Stack, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { ADMIN_GROUPS_QK, postAdminGroup } from '@/api/admin'
import { getBasicErrorFromUnknown } from '@/api/client'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'

export function AdminGroupNewModal({
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
    initialValues: { name: '', description: '' },
    validate: {
      name: (v) => (v.trim().length > 0 ? null : t('fieldRequired')),
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
    mutationFn: () => postAdminGroup(form.values.name.trim(), form.values.description.trim()),
    onSuccess: (g) => {
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ADMIN_GROUPS_QK })
      form.reset()
      onClose()
      navigate(`/admin/account/groups/g/${g.id}`)
    },
    onError: (e) => setError(getBasicErrorFromUnknown(e)),
  })

  return (
    <Modal opened={opened} onClose={onClose} title={t('adminTitleNewGroup')} size="md">
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
          <TextInput label={t('adminGroupsName')} required {...form.getInputProps('name')} />
          <TextInput label={t('adminGroupsDescription')} {...form.getInputProps('description')} />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" type="button" onClick={onClose}>
              {t('back')}
            </Button>
            <Button type="submit" loading={m.isPending}>
              {t('adminGroupsCreate')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
