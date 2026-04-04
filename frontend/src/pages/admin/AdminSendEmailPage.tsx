import { useMutation } from '@tanstack/react-query'
import { Alert, Button, Container, Stack, Text, Textarea, TextInput, Title } from '@mantine/core'
import { useState } from 'react'

import { postAdminSendEmail } from '@/api/admin'
import { getBasicErrorFromUnknown } from '@/api/client'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'

export function AdminSendEmailPage(): React.ReactElement {
  const { t } = useI18n()
  const [subject, setSubject] = useState('')
  const [receivers, setReceivers] = useState('')
  const [receiverGroups, setReceiverGroups] = useState('')
  const [body, setBody] = useState('')
  const [clientError, setClientError] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState<number | null>(null)

  const mutation = useMutation({
    mutationFn: postAdminSendEmail,
    onSuccess: (num) => {
      setSuccessCount(num)
      setSubject('')
      setReceivers('')
      setReceiverGroups('')
      setBody('')
    },
    onError: () => {
      setSuccessCount(null)
    },
  })

  const serverError: BasicError | null = mutation.isError ? getBasicErrorFromUnknown(mutation.error) : null

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    setClientError(null)
    setSuccessCount(null)

    const subj = subject.trim()
    const recv = receivers.trim()
    const groups = receiverGroups.trim()
    const msg = body.trim()

    if (!subj) {
      setClientError(t('fieldRequired'))
      return
    }
    if (!recv && !groups) {
      setClientError(t('adminSendEmailHint'))
      return
    }
    if (!msg) {
      setClientError(t('fieldRequired'))
      return
    }

    mutation.mutate({
      subject: subj,
      body: msg,
      ...(recv ? { receivers: recv } : {}),
      ...(groups ? { receiver_groups: groups } : {}),
    })
  }

  return (
    <Container size="sm" py="md">
      <Title order={2} mb="lg">
        {t('adminTitleSendEmail')}
      </Title>

      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {successCount !== null && (
            <Alert color="green">{t('adminSendEmailSuccess', { n: String(successCount) })}</Alert>
          )}
          {clientError && <Alert color="red">{clientError}</Alert>}
          {serverError && <Alert color="red">{serverError.msg}</Alert>}

          <TextInput
            label={t('adminSendEmailSubject')}
            value={subject}
            onChange={(ev) => setSubject(ev.currentTarget.value)}
            required
            disabled={mutation.isPending}
          />
          <TextInput
            label={t('adminSendEmailReceivers')}
            value={receivers}
            onChange={(ev) => setReceivers(ev.currentTarget.value)}
            disabled={mutation.isPending}
          />
          <TextInput
            label={t('adminSendEmailReceiverGroups')}
            value={receiverGroups}
            onChange={(ev) => setReceiverGroups(ev.currentTarget.value)}
            disabled={mutation.isPending}
          />
          <Text size="sm" c="dimmed">
            {t('adminSendEmailHint')}
          </Text>
          <Textarea
            label={t('adminSendEmailBody')}
            value={body}
            onChange={(ev) => setBody(ev.currentTarget.value)}
            minRows={8}
            required
            disabled={mutation.isPending}
          />
          <Button type="submit" loading={mutation.isPending}>
            {t('adminSendEmailSubmit')}
          </Button>
        </Stack>
      </form>
    </Container>
  )
}
