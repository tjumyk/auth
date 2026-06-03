import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Anchor,
  Button,
  Checkbox,
  Group,
  Loader,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { IconArrowLeft } from '@tabler/icons-react'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'

import {
  ADMIN_GROUPS_QK,
  ADMIN_GROUP_USERS_QK,
  ADMIN_USERS_QK,
  adminGroupAddUserByName,
  adminGroupRemoveUserByName,
  deleteAdminUserByName,
  fetchAdminGroups,
  getAdminUserByName,
  postAdminInviteUser,
} from '@/api/admin'
import { fetchExternalAuthProviders } from '@/api/account'
import { getBasicErrorFromUnknown } from '@/api/client'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'
import { ConfirmEmailUrlField } from '@/components/admin/ConfirmEmailUrlField'
import { mailEnabled } from '@/models/mailConfig'
import {
  type BatchListFormat,
  type BatchUserListRow,
  batchRowsHaveClientErrors,
  parseBatchUserList,
} from '@/utils/batchUserListParse'

const PROCESS_DELAY_MS = 300

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

type BatchOp = 'find' | 'invite' | 'delete' | 'addGroup' | 'removeGroup'

export function AdminBatchUsersPage(): React.ReactElement {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const [format, setFormat] = useState<BatchListFormat>('csv')
  const [userRawList, setUserRawList] = useState('')
  const [emailPrefix, setEmailPrefix] = useState('')
  const [emailSuffix, setEmailSuffix] = useState('')

  const [debouncedRaw] = useDebouncedValue(userRawList, 300)
  const [debouncedPrefix] = useDebouncedValue(emailPrefix, 300)
  const [debouncedSuffix] = useDebouncedValue(emailSuffix, 300)

  const liveParsed = useMemo(
    () => parseBatchUserList(debouncedRaw, format, debouncedPrefix, debouncedSuffix),
    [debouncedRaw, debouncedPrefix, debouncedSuffix, format],
  )
  const [batchWorkingRows, setBatchWorkingRows] = useState<BatchUserListRow[] | null>(null)
  const rows = batchWorkingRows ?? liveParsed

  const [processing, setProcessing] = useState(false)
  const abortRef = useRef(false)
  const [processed, setProcessed] = useState(0)
  const [progressOp, setProgressOp] = useState<BatchOp | null>(null)

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [extProviderId, setExtProviderId] = useState<string | null>(null)
  const [skipEmailConfirmation, setSkipEmailConfirmation] = useState(false)

  const [banner, setBanner] = useState<string | null>(null)

  const groupsQ = useQuery({ queryKey: ADMIN_GROUPS_QK, queryFn: fetchAdminGroups })
  const providersQ = useQuery({
    queryKey: ['externalAuthProviders'],
    queryFn: fetchExternalAuthProviders,
  })

  const selectedGid = selectedGroupId ? Number.parseInt(selectedGroupId, 10) : NaN
  const selectedGroup = groupsQ.data?.find((g) => g.id === selectedGid)

  const groupSelectData =
    groupsQ.data?.map((g) => ({ value: String(g.id), label: g.name })) ?? []
  const providerOptions =
    providersQ.data?.map((p) => ({ value: p.id, label: p.name })) ?? []
  const showProviderFields = (providersQ.data?.length ?? 0) > 0

  const progressLabel = (): string => {
    if (!progressOp) {
      return ''
    }
    const g = selectedGroup?.name ?? ''
    switch (progressOp) {
      case 'find':
        return t('adminBatchProgressFind')
      case 'invite':
        return t('adminBatchProgressInvite')
      case 'delete':
        return t('adminBatchProgressDelete')
      case 'addGroup':
        return t('adminBatchProgressAddGroup', { group: g })
      case 'removeGroup':
        return t('adminBatchProgressRemoveGroup', { group: g })
      default:
        return ''
    }
  }

  const invalidateAfterMutation = (op: BatchOp): void => {
    void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QK })
    if (op === 'addGroup' || op === 'removeGroup') {
      if (selectedGroup) {
        void queryClient.invalidateQueries({ queryKey: ADMIN_GROUP_USERS_QK(selectedGroup.id) })
      }
      void queryClient.invalidateQueries({ queryKey: ADMIN_GROUPS_QK })
    }
  }

  const runBatch = async (op: BatchOp): Promise<void> => {
    setBanner(null)
    if (!rows.length) {
      setBanner(t('adminBatchNoRows'))
      return
    }
    if (batchRowsHaveClientErrors(rows)) {
      setBanner(t('adminBatchHasParseErrors'))
      return
    }
    if (op === 'addGroup' || op === 'removeGroup') {
      if (!selectedGroup) {
        setBanner(t('adminBatchSelectGroupFirst'))
        return
      }
    }
    if (op === 'delete') {
      if (!window.confirm(t('adminBatchConfirmDelete'))) {
        return
      }
    }

    const initialRows = structuredClone(rows) as BatchUserListRow[]

    abortRef.current = false
    setBatchWorkingRows(initialRows)
    setProcessing(true)
    setProgressOp(op)
    setProcessed(0)

    try {
    for (const [i, snapshot] of initialRows.entries()) {
      if (abortRef.current) {
        break
      }
      if (snapshot.clientError || !snapshot.form) {
        setProcessed((p) => p + 1)
        continue
      }

      const name = snapshot.form.name

      setBatchWorkingRows((prev) => {
        const n = [...(prev ?? initialRows)]
        n[i] = {
          ...n[i],
          waiting: true,
          serverError: null,
          success: null,
          processing: false,
        }
        return n
      })

      // Sequential batch (same as legacy Angular admin UI)
      await sleep(PROCESS_DELAY_MS)
      if (abortRef.current) {
        break
      }

      setBatchWorkingRows((prev) => {
        const n = [...(prev ?? initialRows)]
        n[i] = { ...n[i], waiting: false, processing: true }
        return n
      })

      const fail = (err: BasicError): void => {
        setBatchWorkingRows((prev) => {
          const n = [...(prev ?? initialRows)]
          n[i] = { ...n[i], processing: false, serverError: err }
          return n
        })
      }

      try {
        switch (op) {
          case 'find': {
            const u = await getAdminUserByName(name)
            setBatchWorkingRows((prev) => {
              const n = [...(prev ?? initialRows)]
              n[i] = {
                ...n[i],
                processing: false,
                user: u,
                success: t('adminBatchStatusFound'),
              }
              return n
            })
            break
          }
          case 'invite': {
            const u = await postAdminInviteUser({
              name,
              email: snapshot.form!.email,
              external_auth_provider_id: extProviderId && extProviderId.length > 0 ? extProviderId : undefined,
              skip_email_confirmation: Boolean(extProviderId) && skipEmailConfirmation,
            })
            setBatchWorkingRows((prev) => {
              const n = [...(prev ?? initialRows)]
              n[i] = {
                ...n[i],
                processing: false,
                user: u,
                success: t('adminBatchStatusInvited'),
                confirm_email_url: u.confirm_email_url ?? null,
              }
              return n
            })
            break
          }
          case 'delete': {
            await deleteAdminUserByName(name)
            setBatchWorkingRows((prev) => {
              const n = [...(prev ?? initialRows)]
              n[i] = {
                ...n[i],
                processing: false,
                user: null,
                success: t('adminBatchStatusDeleted'),
              }
              return n
            })
            break
          }
          case 'addGroup': {
            await adminGroupAddUserByName(selectedGroup!.id, name)
            setBatchWorkingRows((prev) => {
              const n = [...(prev ?? initialRows)]
              n[i] = {
                ...n[i],
                processing: false,
                success: t('adminBatchStatusAddedToGroup', { group: selectedGroup!.name }),
              }
              return n
            })
            break
          }
          case 'removeGroup': {
            await adminGroupRemoveUserByName(selectedGroup!.id, name)
            setBatchWorkingRows((prev) => {
              const n = [...(prev ?? initialRows)]
              n[i] = {
                ...n[i],
                processing: false,
                success: t('adminBatchStatusRemovedFromGroup', { group: selectedGroup!.name }),
              }
              return n
            })
            break
          }
          default:
            break
        }
      } catch (e: unknown) {
        const be = getBasicErrorFromUnknown(e) ?? { msg: 'Request failed' }
        fail(be)
      }

      setProcessed((p) => p + 1)
    }
    } finally {
      setProcessing(false)
      setProgressOp(null)
      setBatchWorkingRows(null)
    }
    invalidateAfterMutation(op)
  }

  const rowCount = rows.length
  const progressPct = rowCount > 0 ? Math.min(100, (processed / rowCount) * 100) : 0

  return (
    <Stack gap="md" p="md">
      <Group justify="flex-start" wrap="nowrap">
        <Button
          component={Link}
          to="/admin/account/users"
          variant="subtle"
          size="sm"
          leftSection={<IconArrowLeft size={16} />}
        >
          {t('adminUsersBackToList')}
        </Button>
      </Group>
      <Title order={2}>{t('adminTitleBatchUsers')}</Title>

      {banner ? (
        <Alert color="yellow" onClose={() => setBanner(null)} withCloseButton>
          {banner}
        </Alert>
      ) : null}

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Paper p="md" withBorder>
          <Stack gap="sm">
            <Select
              label={t('adminBatchListFormat')}
              disabled={processing}
              data={[
                { value: 'csv', label: t('adminBatchFormatCsv') },
                { value: 'tsv', label: t('adminBatchFormatTsv') },
                { value: 'json', label: t('adminBatchFormatJson') },
              ]}
              value={format}
              onChange={(v) => v && setFormat(v as BatchListFormat)}
            />
            <Text size="sm" fw={600}>
              {t('adminBatchFormatRequirements')}
            </Text>
            <Text size="sm" c="dimmed">
              {format === 'json' ? t('adminBatchHelpJsonIntro') : t('adminBatchHelpCsvTsvIntro')}
            </Text>
            <Textarea
              label={t('adminBatchUserList')}
              disabled={processing}
              minRows={12}
              value={userRawList}
              onChange={(e) => setUserRawList(e.currentTarget.value)}
            />
            <TextInput
              label={t('adminBatchEmailPrefix')}
              disabled={processing}
              placeholder={t('adminBatchEmailPrefixPlaceholder')}
              value={emailPrefix}
              onChange={(e) => setEmailPrefix(e.currentTarget.value)}
            />
            <TextInput
              label={t('adminBatchEmailSuffix')}
              disabled={processing}
              placeholder={t('adminBatchEmailSuffixPlaceholder')}
              value={emailSuffix}
              onChange={(e) => setEmailSuffix(e.currentTarget.value)}
            />
          </Stack>
        </Paper>

        <Stack gap="md">
          <Paper p="md" withBorder>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Stack gap="sm">
                <Text fw={600}>{t('adminBatchSectionUsers')}</Text>
                <Button
                  variant="light"
                  disabled={processing}
                  loading={processing && progressOp === 'find'}
                  onClick={() => void runBatch('find')}
                >
                  {t('adminBatchFindUsers')}
                </Button>
                <Button
                  color="green"
                  variant="light"
                  disabled={processing}
                  loading={processing && progressOp === 'invite'}
                  onClick={() => void runBatch('invite')}
                >
                  {t('adminBatchInviteUsers')}
                </Button>
                <Button
                  color="red"
                  variant="light"
                  disabled={processing}
                  loading={processing && progressOp === 'delete'}
                  onClick={() => void runBatch('delete')}
                >
                  {t('adminBatchDeleteUsers')}
                </Button>

                {showProviderFields ? (
                  <>
                    <Text size="sm" fw={600} mt="sm">
                      {t('adminInviteAuthProvider')}
                    </Text>
                    <Select
                      disabled={processing}
                      clearable
                      placeholder={t('adminInviteAuthProviderLocal')}
                      data={providerOptions}
                      value={extProviderId}
                      onChange={(v) => {
                        setExtProviderId(v)
                        if (!v) {
                          setSkipEmailConfirmation(false)
                        }
                      }}
                    />
                    {extProviderId ? (
                      <Checkbox
                        disabled={processing}
                        label={t('adminInviteSkipEmailConfirmation')}
                        checked={skipEmailConfirmation}
                        onChange={(e) => setSkipEmailConfirmation(e.currentTarget.checked)}
                      />
                    ) : null}
                  </>
                ) : null}
              </Stack>

              <Stack gap="sm">
                <Text fw={600}>{t('adminBatchSectionGroups')}</Text>
                {groupsQ.isPending ? <Loader size="sm" /> : null}
                <Select
                  label={t('adminBatchSelectGroup')}
                  disabled={processing || groupsQ.isPending}
                  placeholder={t('adminBatchSelectGroupPlaceholder')}
                  data={groupSelectData}
                  value={selectedGroupId}
                  onChange={setSelectedGroupId}
                  clearable
                />
                <Button
                  color="green"
                  variant="light"
                  disabled={processing}
                  loading={processing && progressOp === 'addGroup'}
                  onClick={() => void runBatch('addGroup')}
                >
                  {t('adminBatchAddToGroup')}
                </Button>
                <Button
                  color="red"
                  variant="light"
                  disabled={processing}
                  loading={processing && progressOp === 'removeGroup'}
                  onClick={() => void runBatch('removeGroup')}
                >
                  {t('adminBatchRemoveFromGroup')}
                </Button>
              </Stack>
            </SimpleGrid>
          </Paper>

          {processing ? (
            <Paper p="md" withBorder>
              <Stack gap="sm">
                <Progress value={progressPct} size="sm" />
                <Text size="sm">
                  {t('adminBatchProgress', {
                    label: progressLabel(),
                    done: String(processed),
                    total: String(rowCount),
                  })}
                </Text>
                <Button
                  variant="default"
                  size="xs"
                  onClick={() => {
                    abortRef.current = true
                  }}
                >
                  {t('adminBatchAbort')}
                </Button>
              </Stack>
            </Paper>
          ) : null}

          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('adminBatchColRow')}</Table.Th>
                <Table.Th>{t('adminUsersColName')}</Table.Th>
                <Table.Th>{t('adminUsersColEmail')}</Table.Th>
                <Table.Th>{t('adminBatchColStatus')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((item, i) => (
                <Table.Tr key={i}>
                  {item.clientError ? (
                    <Table.Td colSpan={4}>
                      <Text size="sm" c="red" fw={600}>
                        {item.clientError.msg}
                      </Text>
                      {item.clientError.detail ? (
                        <Text size="sm" c="red">
                          {item.clientError.detail}
                        </Text>
                      ) : null}
                    </Table.Td>
                  ) : item.form ? (
                    <>
                      <Table.Td>{i + 1}</Table.Td>
                      <Table.Td>
                        {item.user ? (
                          <Anchor component={Link} to={`/admin/account/users/u/${item.user.id}`} size="sm">
                            {item.form.name}
                          </Anchor>
                        ) : (
                          <Text size="sm">{item.form.name}</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{item.form.email}</Text>
                      </Table.Td>
                      <Table.Td>
                        {item.processing ? (
                          <Text size="sm">{t('adminBatchProcessing')}</Text>
                        ) : null}
                        {item.waiting ? (
                          <Text size="sm" c="dimmed">
                            {t('adminBatchWaiting')}
                          </Text>
                        ) : null}
                        {item.success ? (
                          <Text size="sm" c="teal">
                            {item.success}
                          </Text>
                        ) : null}
                        {item.confirm_email_url ? (
                          <ConfirmEmailUrlField
                            url={item.confirm_email_url}
                            hint={!mailEnabled ? t('mailDisabledConfirmUrlHint') : undefined}
                          />
                        ) : null}
                        {item.serverError ? (
                          <Stack gap={2}>
                            <Text size="sm" c="red" fw={600}>
                              {item.serverError.msg}
                            </Text>
                            {item.serverError.detail ? (
                              <Text size="sm" c="red">
                                {item.serverError.detail}
                              </Text>
                            ) : null}
                          </Stack>
                        ) : null}
                      </Table.Td>
                    </>
                  ) : (
                    <Table.Td colSpan={4}>
                      <Text size="sm" c="dimmed">
                        {t('adminBatchMissingForm')}
                      </Text>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </SimpleGrid>
    </Stack>
  )
}
