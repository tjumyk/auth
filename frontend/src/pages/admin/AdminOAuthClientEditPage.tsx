import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Avatar,
  Button,
  FileButton,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDebouncedValue, useDisclosure } from '@mantine/hooks'
import { IconArrowLeft, IconApps } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import {
  ADMIN_OAUTH_CLIENT_AUTHS_QK,
  ADMIN_OAUTH_CLIENT_QK,
  ADMIN_OAUTH_CLIENTS_QK,
  adminOAuthClientAddAllowedGroup,
  adminOAuthClientRemoveAllowedGroup,
  deleteAdminOAuthClient,
  downloadAdminOAuthClientConfigFile,
  getAdminOAuthClient,
  getAdminOAuthClientAuthorizations,
  postAdminOAuthClientRegenerateSecret,
  putAdminOAuthClientIcon,
  putAdminOAuthClientProfile,
  searchAdminGroupsByName,
  setAdminOAuthClientPublic,
} from '@/api/admin'
import { getBasicErrorFromUnknown } from '@/api/client'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'
import type { AdminGroup, AdminOAuthClient } from '@/models/admin'
import { userAvatarSrc } from '@/utils/userAvatarSrc'

const ICON_MAX = 262_144

function validateIcon(file: File, t: (k: string) => string): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase()
  const ok = ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif'
  if (!ok) return t('avatarInvalidType')
  if (file.size > ICON_MAX) return t('avatarTooLarge')
  return null
}

function clientIconSrc(c: Pick<AdminOAuthClient, 'icon'>): string | undefined {
  return userAvatarSrc({ avatar: c.icon, avatar_full: null })
}

export function AdminOAuthClientEditPage(): React.ReactElement {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const params = useParams()
  const cid = Number.parseInt(String(params.cid), 10)
  const valid = Number.isFinite(cid)

  const [pageError, setPageError] = useState<BasicError | null>(null)
  const [iconErr, setIconErr] = useState<string | null>(null)
  const [groupSearch, setGroupSearch] = useState('')
  const [debounced] = useDebouncedValue(groupSearch.trim(), 300)
  const [searchResults, setSearchResults] = useState<AdminGroup[]>([])
  const [searching, setSearching] = useState(false)
  const [regenOpened, { open: openRegen, close: closeRegen }] = useDisclosure(false)
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false)

  const clientQ = useQuery({
    queryKey: ADMIN_OAUTH_CLIENT_QK(cid),
    queryFn: () => getAdminOAuthClient(cid),
    enabled: valid,
  })

  const authsQ = useQuery({
    queryKey: ADMIN_OAUTH_CLIENT_AUTHS_QK(cid),
    queryFn: () => getAdminOAuthClientAuthorizations(cid),
    enabled: valid && clientQ.isSuccess,
  })

  const profileForm = useForm({
    initialValues: { redirect_url: '', home_url: '', description: '' },
  })

  useEffect(() => {
    if (clientQ.data) {
      profileForm.setValues({
        redirect_url: clientQ.data.redirect_url,
        home_url: clientQ.data.home_url,
        description: clientQ.data.description ?? '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientQ.data?.id])

  useEffect(() => {
    if (debounced.length < 1) {
      setSearchResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    void searchAdminGroupsByName(debounced, 12)
      .then((rows) => {
        if (!cancelled) setSearchResults(rows)
      })
      .catch(() => {
        if (!cancelled) setSearchResults([])
      })
      .finally(() => {
        if (!cancelled) setSearching(false)
      })
    return () => {
      cancelled = true
    }
  }, [debounced])

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ADMIN_OAUTH_CLIENTS_QK })
    void queryClient.invalidateQueries({ queryKey: ADMIN_OAUTH_CLIENT_QK(cid) })
    void queryClient.invalidateQueries({ queryKey: ADMIN_OAUTH_CLIENT_AUTHS_QK(cid) })
  }

  const profileM = useMutation({
    mutationFn: () =>
      putAdminOAuthClientProfile(cid, {
        redirect_url: profileForm.values.redirect_url.trim(),
        home_url: profileForm.values.home_url.trim(),
        description: profileForm.values.description.trim(),
      }),
    onSuccess: () => {
      setPageError(null)
      invalidate()
    },
    onError: (e) => setPageError(getBasicErrorFromUnknown(e)),
  })

  const iconM = useMutation({
    mutationFn: (file: File) => putAdminOAuthClientIcon(cid, file),
    onSuccess: () => {
      setIconErr(null)
      invalidate()
    },
    onError: (e) => setPageError(getBasicErrorFromUnknown(e)),
  })

  const publicM = useMutation({
    mutationFn: (isPublic: boolean) => setAdminOAuthClientPublic(cid, isPublic),
    onSuccess: () => {
      setPageError(null)
      invalidate()
    },
    onError: (e) => setPageError(getBasicErrorFromUnknown(e)),
  })

  const regenM = useMutation({
    mutationFn: () => postAdminOAuthClientRegenerateSecret(cid),
    onSuccess: () => {
      closeRegen()
      setPageError(null)
      invalidate()
    },
    onError: (e) => setPageError(getBasicErrorFromUnknown(e)),
  })

  const deleteM = useMutation({
    mutationFn: () => deleteAdminOAuthClient(cid),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_OAUTH_CLIENTS_QK })
      navigate('/admin/oauth/clients')
    },
    onError: (e) => setPageError(getBasicErrorFromUnknown(e)),
  })

  const addGroupM = useMutation({
    mutationFn: (gid: number) => adminOAuthClientAddAllowedGroup(cid, gid),
    onSuccess: () => {
      setPageError(null)
      invalidate()
    },
    onError: (e) => setPageError(getBasicErrorFromUnknown(e)),
  })

  const removeGroupM = useMutation({
    mutationFn: (gid: number) => adminOAuthClientRemoveAllowedGroup(cid, gid),
    onSuccess: () => {
      setPageError(null)
      invalidate()
    },
    onError: (e) => setPageError(getBasicErrorFromUnknown(e)),
  })

  const copySecret = async (secret: string): Promise<void> => {
    await navigator.clipboard.writeText(secret)
  }

  if (!valid) {
    return (
      <Stack p="md" gap="md">
        <Group justify="flex-start" wrap="nowrap">
          <Button
            component={Link}
            to="/admin/oauth/clients"
            variant="subtle"
            size="sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('adminOAuthBackToList')}
          </Button>
        </Group>
        <Alert color="red">{t('adminOAuthInvalidId')}</Alert>
      </Stack>
    )
  }

  if (clientQ.isPending) {
    return (
      <Stack p="md" gap="md">
        <Group justify="flex-start" wrap="nowrap">
          <Button
            component={Link}
            to="/admin/oauth/clients"
            variant="subtle"
            size="sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('adminOAuthBackToList')}
          </Button>
        </Group>
        <Stack align="center" py="xl">
          <Loader />
        </Stack>
      </Stack>
    )
  }

  if (clientQ.isError || !clientQ.data) {
    return (
      <Stack p="md" gap="md">
        <Group justify="flex-start" wrap="nowrap">
          <Button
            component={Link}
            to="/admin/oauth/clients"
            variant="subtle"
            size="sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('adminOAuthBackToList')}
          </Button>
        </Group>
        <Alert color="red">{t('adminOAuthClientLoadFailed')}</Alert>
      </Stack>
    )
  }

  const c = clientQ.data
  const allowedIds = new Set(c.allowed_groups.map((g) => g.id))

  return (
    <Stack gap="md" p="md">
      <Group justify="flex-start" wrap="nowrap">
        <Button
          component={Link}
          to="/admin/oauth/clients"
          variant="subtle"
          size="sm"
          leftSection={<IconArrowLeft size={16} />}
        >
          {t('adminOAuthBackToList')}
        </Button>
      </Group>
      <Title order={2}>
        {c.name} · {t('adminTitleOAuthClientEdit')}
      </Title>

      {pageError ? (
        <Alert color="red" title={pageError.msg} onClose={() => setPageError(null)} withCloseButton>
          {pageError.detail}
        </Alert>
      ) : null}

      <Paper p="md" withBorder>
        <Title order={4} mb="sm">
          {t('adminOAuthSecret')}
        </Title>
        <Group>
          <Text size="sm" ff="monospace" style={{ wordBreak: 'break-all' }}>
            {c.secret}
          </Text>
          <Button variant="light" size="xs" onClick={() => void copySecret(c.secret)}>
            {t('adminOAuthCopySecret')}
          </Button>
          <Button variant="light" size="xs" color="orange" onClick={openRegen}>
            {t('adminOAuthRegenerateSecret')}
          </Button>
        </Group>
      </Paper>

      <Paper p="md" withBorder>
        <Title order={4} mb="sm">
          {t('adminOAuthAccess')}
        </Title>
        <Group mb="sm">
          <Text size="sm">{t('adminOAuthPublicLabel')}</Text>
          <Button
            size="xs"
            variant="light"
            loading={publicM.isPending}
            onClick={() => publicM.mutate(!c.is_public)}
          >
            {c.is_public ? t('adminOAuthMakePrivate') : t('adminOAuthMakePublic')}
          </Button>
        </Group>
      </Paper>

      <Paper p="md" withBorder>
        <Title order={4} mb="sm">
          {t('adminOAuthProfile')}
        </Title>
        <form
          onSubmit={profileForm.onSubmit(() => {
            profileM.mutate()
          })}
        >
          <Stack gap="sm" maw={560} key={locale}>
            <TextInput label={t('adminOAuthFieldName')} value={c.name} readOnly disabled />
            <TextInput label={t('adminOAuthFieldHomeUrl')} {...profileForm.getInputProps('home_url')} />
            <TextInput
              label={t('adminOAuthFieldRedirectUrl')}
              {...profileForm.getInputProps('redirect_url')}
            />
            <TextInput
              label={t('adminOAuthFieldDescription')}
              {...profileForm.getInputProps('description')}
            />
            <Button type="submit" loading={profileM.isPending}>
              {t('adminOAuthSaveProfile')}
            </Button>
          </Stack>
        </form>
      </Paper>

      <Paper p="md" withBorder>
        <Title order={4} mb="sm">
          {t('iconSection')}
        </Title>
        <Group align="flex-end" gap="md">
          <Avatar src={clientIconSrc(c)} size="lg" radius="md">
            <IconApps size={28} stroke={1.5} />
          </Avatar>
          <Stack gap={4}>
            {iconErr ? (
              <Text size="sm" c="red">
                {iconErr}
              </Text>
            ) : null}
            <FileButton
              onChange={(file) => {
                if (!file) return
                const err = validateIcon(file, t)
                if (err) {
                  setIconErr(err)
                  return
                }
                setIconErr(null)
                iconM.mutate(file)
              }}
              accept="image/png,image/jpeg,image/jpg,image/gif"
            >
              {(props) => (
                <Button {...props} loading={iconM.isPending} variant="light">
                  {t('adminOAuthUploadIcon')}
                </Button>
              )}
            </FileButton>
          </Stack>
        </Group>
      </Paper>

      <Paper p="md" withBorder>
        <Title order={4} mb="sm">
          {t('adminOAuthConfigFile')}
        </Title>
        <Button
          variant="light"
          onClick={() => {
            void (async () => {
              try {
                await downloadAdminOAuthClientConfigFile(cid)
              } catch (e) {
                setPageError(getBasicErrorFromUnknown(e))
              }
            })()
          }}
        >
          {t('adminOAuthDownloadConfig')}
        </Button>
      </Paper>

      <Paper p="md" withBorder>
        <Title order={4} mb="sm">
          {t('adminOAuthAllowedGroups')}
        </Title>
        <Stack gap="xs" mb="md">
          {c.allowed_groups.map((g) => (
            <Group key={g.id} justify="space-between">
              <Text size="sm">
                {g.name} (#{g.id})
              </Text>
              <Button
                size="xs"
                color="red"
                variant="light"
                loading={removeGroupM.isPending}
                onClick={() => removeGroupM.mutate(g.id)}
              >
                {t('adminOAuthRemoveGroup')}
              </Button>
            </Group>
          ))}
        </Stack>
        <TextInput
          label={t('adminOAuthSearchGroups')}
          placeholder={t('adminOAuthSearchGroupsPlaceholder')}
          value={groupSearch}
          onChange={(e) => setGroupSearch(e.currentTarget.value)}
        />
        {searching ? <Loader size="sm" mt="xs" /> : null}
        <Stack gap="xs" mt="sm">
          {searchResults
            .filter((g) => !allowedIds.has(g.id))
            .map((g) => (
              <Group key={g.id} justify="space-between">
                <Text size="sm">
                  {g.name} (#{g.id})
                </Text>
                <Button
                  size="xs"
                  variant="light"
                  loading={addGroupM.isPending}
                  onClick={() => addGroupM.mutate(g.id)}
                >
                  {t('adminOAuthAddGroup')}
                </Button>
              </Group>
            ))}
        </Stack>
      </Paper>

      <Paper p="md" withBorder>
        <Title order={4} mb="sm">
          {t('adminOAuthAuthorizations')}
        </Title>
        {authsQ.isPending ? (
          <Loader size="sm" />
        ) : authsQ.isError ? (
          <Text c="red" size="sm">
            {t('adminOAuthAuthsFailed')}
          </Text>
        ) : (
          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('adminUsersColId')}</Table.Th>
                <Table.Th>{t('adminOAuthAuthUser')}</Table.Th>
                <Table.Th>{t('adminUserAuthCreated')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(authsQ.data ?? []).map((a) => (
                <Table.Tr key={`${a.client_id}-${a.user_id}`}>
                  <Table.Td>{a.user_id}</Table.Td>
                  <Table.Td>{a.user ? `${a.user.name} (${a.user.email})` : `#${a.user_id}`}</Table.Td>
                  <Table.Td>
                    {new Date(a.created_at).toLocaleString(locale === 'zh-Hans' ? 'zh-CN' : 'en-US')}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      <Paper p="md" withBorder>
        <Title order={4} mb="sm" c="red">
          {t('adminUserDangerZone')}
        </Title>
        <Button color="red" variant="light" onClick={openDelete}>
          {t('adminOAuthDeleteClient')}
        </Button>
      </Paper>

      <Modal opened={regenOpened} onClose={closeRegen} title={t('adminOAuthRegenConfirmTitle')}>
        <Text size="sm" mb="md">
          {t('adminOAuthRegenConfirmBody')}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={closeRegen}>
            {t('back')}
          </Button>
          <Button color="orange" loading={regenM.isPending} onClick={() => regenM.mutate()}>
            {t('adminOAuthRegenerateSecret')}
          </Button>
        </Group>
      </Modal>

      <Modal opened={deleteOpened} onClose={closeDelete} title={t('adminOAuthDeleteConfirmTitle')}>
        <Text size="sm" mb="md">
          {t('adminOAuthDeleteConfirmBody', { name: c.name })}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={closeDelete}>
            {t('back')}
          </Button>
          <Button color="red" loading={deleteM.isPending} onClick={() => deleteM.mutate()}>
            {t('adminOAuthDeleteClient')}
          </Button>
        </Group>
      </Modal>
    </Stack>
  )
}
