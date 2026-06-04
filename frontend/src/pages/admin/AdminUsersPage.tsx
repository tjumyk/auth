import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Group, Loader, Stack, Table, Text, TextInput, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconPencil, IconSearch, IconUserPlus } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { ADMIN_USERS_QK, fetchAdminUserList } from '@/api/admin'
import { AdminTablePaginationControls } from '@/components/admin/AdminTablePaginationControls'
import { useAdminTablePagination } from '@/hooks/useAdminTablePagination'
import { useI18n } from '@/hooks/useI18n'
import type { AdminUser } from '@/models/admin'

import { AdminUserInviteModal } from '@/pages/admin/AdminUserInviteModal'
import { groupNameToBadgeColor } from '@/utils/groupBadgeColor'

type AdminUsersLocationState = { adminOpenInvite?: boolean }

function UserGroupPills({ user }: { user: AdminUser }): React.ReactElement {
  const groups = user.groups ?? []
  if (groups.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        —
      </Text>
    )
  }
  return (
    <Group gap={6} wrap="wrap">
      {groups.map((g) => (
        <Badge
          key={g.id}
          variant="light"
          size="sm"
          color={groupNameToBadgeColor(g.name)}
        >
          {g.name}
        </Badge>
      ))}
    </Group>
  )
}

export function AdminUsersPage(): React.ReactElement {
  const { t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('')
  const [inviteOpened, { open: openInvite, close: closeInvite }] = useDisclosure(false)

  useEffect(() => {
    const s = location.state as AdminUsersLocationState | null
    if (s?.adminOpenInvite) {
      openInvite()
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, navigate, openInvite])

  const q = useQuery({ queryKey: ADMIN_USERS_QK, queryFn: fetchAdminUserList })

  const rows = useMemo(() => {
    if (!q.data) {
      return []
    }
    const f = filter.trim().toLowerCase()
    if (!f) {
      return q.data
    }
    return q.data.filter((u) => {
      const nick = (u.nickname ?? '').toLowerCase()
      const real = (u.real_name ?? '').toLowerCase()
      const mobile = (u.mobile ?? '').toLowerCase()
      return (
        u.name.toLowerCase().includes(f) ||
        nick.includes(f) ||
        real.includes(f) ||
        mobile.includes(f) ||
        u.email.toLowerCase().includes(f) ||
        String(u.id).includes(f)
      )
    })
  }, [q.data, filter])

  const {
    setPage,
    setPageSize,
    pageItems: pageRows,
    totalPages,
    currentPage,
    rangeFrom,
    rangeTo,
    pageSize,
  } = useAdminTablePagination(rows)

  return (
    <Stack gap="md" p="md">
      <AdminUserInviteModal opened={inviteOpened} onClose={closeInvite} />

      <Group justify="space-between" align="flex-end" wrap="wrap">
        <Title order={2}>{t('adminTitleUsers')}</Title>
        <Group gap="xs" wrap="wrap">
          <Button
            type="button"
            leftSection={<IconUserPlus size={18} />}
            onClick={() => openInvite()}
          >
            {t('adminUsersInvite')}
          </Button>
        </Group>
      </Group>

      <TextInput
        leftSection={<IconSearch size={18} />}
        placeholder={t('adminUsersFilterPlaceholder')}
        value={filter}
        onChange={(e) => {
          setFilter(e.currentTarget.value)
          setPage(1)
        }}
        style={{ maxWidth: 360 }}
      />

      {q.isPending ? (
        <Loader />
      ) : q.isError ? (
        <Text c="red" size="sm">
          {t('adminUsersLoadFailed')}
        </Text>
      ) : (
        <Table.ScrollContainer
          minWidth={960}
          maw="100%"
          scrollAreaProps={{ scrollbars: 'x', type: 'auto' }}
        >
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('adminUsersColId')}</Table.Th>
                <Table.Th>{t('adminUsersColName')}</Table.Th>
                <Table.Th>{t('nickname')}</Table.Th>
                <Table.Th>{t('realName')}</Table.Th>
                <Table.Th>{t('mobile')}</Table.Th>
                <Table.Th>{t('adminUsersColEmail')}</Table.Th>
                <Table.Th>{t('adminUsersColActive')}</Table.Th>
                <Table.Th>{t('adminUsersColEmailConfirmed')}</Table.Th>
                <Table.Th>{t('adminUsersColGroups')}</Table.Th>
                <Table.Th>{t('adminUsersColActions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pageRows.map((u) => (
                <Table.Tr key={u.id}>
                  <Table.Td>{u.id}</Table.Td>
                  <Table.Td>{u.name}</Table.Td>
                  <Table.Td>
                    {u.nickname?.trim() ? (
                      <Text size="sm">{u.nickname}</Text>
                    ) : (
                      <Text size="sm" c="dimmed">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {u.real_name?.trim() ? (
                      <Text size="sm">{u.real_name}</Text>
                    ) : (
                      <Text size="sm" c="dimmed">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {u.mobile?.trim() ? (
                      <Text size="sm">{u.mobile}</Text>
                    ) : (
                      <Text size="sm" c="dimmed">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>{u.email}</Table.Td>
                  <Table.Td>
                    {u.is_active ? (
                      <Badge color="teal" variant="light">
                        {t('statusActive')}
                      </Badge>
                    ) : (
                      <Badge color="gray" variant="light">
                        {t('statusInactive')}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {u.is_email_confirmed ? (
                      <Badge color="teal" variant="light">
                        {t('adminUsersYes')}
                      </Badge>
                    ) : (
                      <Badge color="orange" variant="light">
                        {t('adminUsersNo')}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td style={{ maxWidth: 280 }}>
                    <UserGroupPills user={u} />
                  </Table.Td>
                  <Table.Td>
                    <Button
                      component={Link}
                      to={`/admin/account/users/u/${u.id}`}
                      variant="subtle"
                      color="gray"
                      size="xs"
                      leftSection={<IconPencil size={16} />}
                    >
                      {t('adminUsersEdit')}
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      {!q.isPending && !q.isError && rows.length > 0 ? (
        <AdminTablePaginationControls
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      ) : null}

      {!q.isPending && !q.isError ? (
        <Text size="xs" c="dimmed">
          {t('adminUsersPaginationSummary', {
            from: String(rangeFrom),
            to: String(rangeTo),
            filtered: String(rows.length),
            total: String(q.data?.length ?? 0),
            page: String(currentPage),
            pages: String(totalPages),
          })}
        </Text>
      ) : null}
    </Stack>
  )
}
