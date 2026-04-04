import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Group,
  Loader,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDebouncedValue } from '@mantine/hooks'
import { IconArrowLeft } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import {
  ADMIN_GROUP_QK,
  ADMIN_GROUP_USERS_QK,
  ADMIN_GROUPS_QK,
  adminGroupAddUserByName,
  adminGroupRemoveUser,
  deleteAdminGroup,
  getAdminGroup,
  getAdminGroupUsers,
  putAdminGroupDescription,
  searchAdminUsersByName,
} from '@/api/admin'
import { getBasicErrorFromUnknown } from '@/api/client'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'
import type { AdminUser } from '@/models/admin'

export function AdminGroupEditPage(): React.ReactElement {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const params = useParams()
  const gid = Number.parseInt(String(params.gid), 10)
  const valid = Number.isFinite(gid)

  const [pageError, setPageError] = useState<BasicError | null>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [debouncedMemberSearch] = useDebouncedValue(memberSearch.trim(), 300)
  const [userSearchResults, setUserSearchResults] = useState<AdminUser[]>([])
  const [userSearchLoading, setUserSearchLoading] = useState(false)

  const groupQ = useQuery({
    queryKey: ADMIN_GROUP_QK(gid, true),
    queryFn: () => getAdminGroup(gid, true),
    enabled: valid,
  })

  const usersQ = useQuery({
    queryKey: ADMIN_GROUP_USERS_QK(gid),
    queryFn: () => getAdminGroupUsers(gid),
    enabled: valid && groupQ.isSuccess,
  })

  const memberIds = useMemo(
    () => new Set((usersQ.data ?? []).map((u) => u.id)),
    [usersQ.data],
  )

  useEffect(() => {
    if (debouncedMemberSearch.length < 1) {
      setUserSearchResults([])
      return
    }
    let cancelled = false
    setUserSearchLoading(true)
    void searchAdminUsersByName(debouncedMemberSearch, 12)
      .then((rows) => {
        if (!cancelled) setUserSearchResults(rows)
      })
      .catch(() => {
        if (!cancelled) setUserSearchResults([])
      })
      .finally(() => {
        if (!cancelled) setUserSearchLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedMemberSearch])

  const descForm = useForm({
    initialValues: { description: '' },
  })

  useEffect(() => {
    if (groupQ.data) {
      descForm.setValues({ description: groupQ.data.description ?? '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate when group id loads
  }, [groupQ.data?.id])

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ADMIN_GROUPS_QK })
    void queryClient.invalidateQueries({ queryKey: ADMIN_GROUP_QK(gid, true) })
    void queryClient.invalidateQueries({ queryKey: ADMIN_GROUP_USERS_QK(gid) })
  }

  const descM = useMutation({
    mutationFn: (description: string) => putAdminGroupDescription(gid, description.trim()),
    onSuccess: () => {
      setPageError(null)
      invalidate()
    },
    onError: (e) => setPageError(getBasicErrorFromUnknown(e)),
  })

  const addM = useMutation({
    mutationFn: (name: string) => adminGroupAddUserByName(gid, name.trim()),
    onSuccess: () => {
      setPageError(null)
      setMemberSearch('')
      setUserSearchResults([])
      invalidate()
    },
    onError: (e) => setPageError(getBasicErrorFromUnknown(e)),
  })

  const removeM = useMutation({
    mutationFn: (uid: number) => adminGroupRemoveUser(gid, uid),
    onSuccess: () => {
      setPageError(null)
      invalidate()
    },
    onError: (e) => setPageError(getBasicErrorFromUnknown(e)),
  })

  const deleteM = useMutation({
    mutationFn: () => deleteAdminGroup(gid),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_GROUPS_QK })
      navigate('/admin/account/groups')
    },
    onError: (e) => setPageError(getBasicErrorFromUnknown(e)),
  })

  if (!valid) {
    return (
      <Stack p="md" gap="md">
        <Group justify="flex-start" wrap="nowrap">
          <Button
            component={Link}
            to="/admin/account/groups"
            variant="subtle"
            size="sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('adminGroupsBackToList')}
          </Button>
        </Group>
        <Alert color="red">{t('adminGroupInvalidId')}</Alert>
      </Stack>
    )
  }

  if (groupQ.isPending) {
    return (
      <Stack p="md" gap="md">
        <Group justify="flex-start" wrap="nowrap">
          <Button
            component={Link}
            to="/admin/account/groups"
            variant="subtle"
            size="sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('adminGroupsBackToList')}
          </Button>
        </Group>
        <Stack align="center" py="xl">
          <Loader />
        </Stack>
      </Stack>
    )
  }

  if (groupQ.isError || !groupQ.data) {
    return (
      <Stack p="md" gap="md">
        <Group justify="flex-start" wrap="nowrap">
          <Button
            component={Link}
            to="/admin/account/groups"
            variant="subtle"
            size="sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('adminGroupsBackToList')}
          </Button>
        </Group>
        <Alert color="red">{t('adminGroupLoadFailed')}</Alert>
      </Stack>
    )
  }

  const g = groupQ.data

  return (
    <Stack gap="md" p="md">
      <Group justify="flex-start" wrap="nowrap">
        <Button
          component={Link}
          to="/admin/account/groups"
          variant="subtle"
          size="sm"
          leftSection={<IconArrowLeft size={16} />}
        >
          {t('adminGroupsBackToList')}
        </Button>
      </Group>
      <Title order={2}>
        {g.name} · {t('adminTitleGroupEdit')}
      </Title>

      {pageError ? (
        <Alert color="red" title={pageError.msg} onClose={() => setPageError(null)} withCloseButton>
          {pageError.detail}
        </Alert>
      ) : null}

      <Paper p="md" withBorder>
        <Title order={4} mb="sm">
          {t('adminGroupsDescription')}
        </Title>
        <form
          onSubmit={descForm.onSubmit((v) => {
            descM.mutate(v.description)
          })}
        >
          <Stack gap="sm" maw={480} key={locale}>
            <TextInput label={t('adminGroupsName')} value={g.name} readOnly disabled />
            <TextInput label={t('adminGroupsDescription')} {...descForm.getInputProps('description')} />
            <Button type="submit" loading={descM.isPending}>
              {t('adminGroupsSaveDescription')}
            </Button>
          </Stack>
        </form>
      </Paper>

      <Paper p="md" withBorder>
        <Title order={4} mb="sm">
          {t('adminGroupMembers')}
        </Title>
        <TextInput
          label={t('adminGroupSearchUsers')}
          placeholder={t('adminGroupSearchUsersPlaceholder')}
          value={memberSearch}
          onChange={(e) => setMemberSearch(e.currentTarget.value)}
          mb="xs"
        />
        {userSearchLoading ? <Loader size="sm" /> : null}
        <Stack gap="xs" mt="sm" mb="sm">
          {userSearchResults
            .filter((u) => !memberIds.has(u.id))
            .map((u) => (
              <Group key={u.id} justify="space-between" wrap="nowrap">
                <Text size="sm" lineClamp={2} style={{ flex: 1, minWidth: 0 }}>
                  <Text component="span" fw={500}>
                    {u.name}
                  </Text>
                  {u.nickname?.trim() ? (
                    <Text component="span" c="dimmed">
                      {' '}
                      ({u.nickname})
                    </Text>
                  ) : null}
                  <Text component="span" c="dimmed">
                    {' '}
                    · {u.email}
                  </Text>
                </Text>
                <Button
                  size="xs"
                  variant="light"
                  loading={addM.isPending}
                  onClick={() => addM.mutate(u.name)}
                >
                  {t('adminGroupAddMember')}
                </Button>
              </Group>
            ))}
        </Stack>
        {usersQ.isPending ? (
          <Loader size="sm" />
        ) : (
          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('adminUsersColId')}</Table.Th>
                <Table.Th>{t('adminUsersColName')}</Table.Th>
                <Table.Th>{t('adminUsersColEmail')}</Table.Th>
                <Table.Th>{t('adminUsersColActions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(usersQ.data ?? []).map((u) => (
                <Table.Tr key={u.id}>
                  <Table.Td>{u.id}</Table.Td>
                  <Table.Td>{u.name}</Table.Td>
                  <Table.Td>{u.email}</Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      color="red"
                      variant="light"
                      loading={removeM.isPending}
                      onClick={() => removeM.mutate(u.id)}
                    >
                      {t('adminGroupRemoveMember')}
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      {(g.allowed_clients ?? []).length > 0 ? (
        <Paper p="md" withBorder>
          <Title order={4} mb="sm">
            {t('adminGroupAllowedClients')}
          </Title>
          <Stack gap="xs">
            {(g.allowed_clients ?? []).map((c) => (
              <Text key={c.id} size="sm">
                {c.name} (#{c.id})
              </Text>
            ))}
          </Stack>
        </Paper>
      ) : null}

      <Paper p="md" withBorder>
        <Title order={4} mb="sm" c="red">
          {t('adminUserDangerZone')}
        </Title>
        <Button color="red" variant="light" loading={deleteM.isPending} onClick={() => deleteM.mutate()}>
          {t('adminGroupDelete')}
        </Button>
      </Paper>
    </Stack>
  )
}
