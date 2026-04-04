import { useQuery } from '@tanstack/react-query'
import { Anchor, Button, Group, Loader, Stack, Table, Text, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconPencil, IconPlus } from '@tabler/icons-react'
import { useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { ADMIN_GROUPS_QK, fetchAdminGroups } from '@/api/admin'
import { AdminTablePaginationControls } from '@/components/admin/AdminTablePaginationControls'
import { useAdminTablePagination } from '@/hooks/useAdminTablePagination'
import { useI18n } from '@/hooks/useI18n'

import { AdminGroupNewModal } from '@/pages/admin/AdminGroupNewModal'

type AdminGroupsLocationState = { adminOpenNewGroup?: boolean }

export function AdminGroupsPage(): React.ReactElement {
  const { t, locale } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const [newGroupOpened, { open: openNewGroup, close: closeNewGroup }] = useDisclosure(false)

  useEffect(() => {
    const s = location.state as AdminGroupsLocationState | null
    if (s?.adminOpenNewGroup) {
      openNewGroup()
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, navigate, openNewGroup])

  const q = useQuery({ queryKey: ADMIN_GROUPS_QK, queryFn: fetchAdminGroups })

  const rows = useMemo(() => q.data ?? [], [q.data])
  const {
    setPage,
    setPageSize,
    pageItems,
    pageSize,
    totalPages,
    currentPage,
    rangeFrom,
    rangeTo,
    totalCount,
  } = useAdminTablePagination(rows)

  return (
    <Stack gap="md" p="md">
      <AdminGroupNewModal opened={newGroupOpened} onClose={closeNewGroup} />

      <Group justify="space-between" wrap="wrap">
        <Title order={2}>{t('adminTitleGroups')}</Title>
        <Button type="button" leftSection={<IconPlus size={18} />} onClick={() => openNewGroup()}>
          {t('adminGroupsNew')}
        </Button>
      </Group>

      {q.isPending ? (
        <Loader />
      ) : q.isError ? (
        <Anchor c="red">{t('adminGroupsLoadFailed')}</Anchor>
      ) : (
        <Table.ScrollContainer
          minWidth={720}
          maw="100%"
          scrollAreaProps={{ scrollbars: 'x', type: 'auto' }}
        >
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('adminGroupsColId')}</Table.Th>
                <Table.Th>{t('adminGroupsColName')}</Table.Th>
                <Table.Th>{t('adminGroupsColDescription')}</Table.Th>
                <Table.Th>{t('adminGroupsColCreated')}</Table.Th>
                <Table.Th>{t('adminUsersColActions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pageItems.map((g) => (
                <Table.Tr key={g.id}>
                  <Table.Td>{g.id}</Table.Td>
                  <Table.Td>{g.name}</Table.Td>
                  <Table.Td>{g.description ?? '—'}</Table.Td>
                  <Table.Td>
                    {new Date(g.created_at).toLocaleString(locale === 'zh-Hans' ? 'zh-CN' : 'en-US')}
                  </Table.Td>
                  <Table.Td>
                    <Button
                      component={Link}
                      to={`/admin/account/groups/g/${g.id}`}
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
          {t('adminListPaginationSummary', {
            from: String(rangeFrom),
            to: String(rangeTo),
            total: String(totalCount),
            page: String(currentPage),
            pages: String(totalPages),
          })}
        </Text>
      ) : null}
    </Stack>
  )
}
