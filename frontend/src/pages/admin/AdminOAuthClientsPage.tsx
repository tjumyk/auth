import { useQuery } from '@tanstack/react-query'
import { Anchor, Badge, Button, Group, Loader, Stack, Table, Text, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconPencil, IconPlus } from '@tabler/icons-react'
import { useEffect, useMemo, type ReactElement } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { ADMIN_OAUTH_CLIENTS_QK, fetchAdminOAuthClients } from '@/api/admin'
import { AdminTablePaginationControls } from '@/components/admin/AdminTablePaginationControls'
import { useAdminTablePagination } from '@/hooks/useAdminTablePagination'
import { useI18n } from '@/hooks/useI18n'
import type { AdminOAuthClient } from '@/models/admin'

import { AdminOAuthClientNewModal } from '@/pages/admin/AdminOAuthClientNewModal'
import { groupNameToBadgeColor } from '@/utils/groupBadgeColor'

type AdminOAuthClientsLocationState = { adminOpenNewOAuthClient?: boolean }

function OAuthClientAccessibleGroupsCell({
  client,
  t,
}: {
  client: AdminOAuthClient
  t: (key: string) => string
}): ReactElement {
  if (client.is_public) {
    return (
      <Text size="sm" c="dimmed">
        {t('adminOAuthMakePublic')}
      </Text>
    )
  }
  const groups = client.allowed_groups ?? []
  if (groups.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        —
      </Text>
    )
  }
  return (
    <Group gap={6} wrap="wrap">
      {groups.map((g) => (
        <Badge key={g.id} variant="light" size="sm" color={groupNameToBadgeColor(g.name)}>
          {g.name}
        </Badge>
      ))}
    </Group>
  )
}

export function AdminOAuthClientsPage(): React.ReactElement {
  const { t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const [newClientOpened, { open: openNewClient, close: closeNewClient }] = useDisclosure(false)

  useEffect(() => {
    const s = location.state as AdminOAuthClientsLocationState | null
    if (s?.adminOpenNewOAuthClient) {
      openNewClient()
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, navigate, openNewClient])

  const q = useQuery({ queryKey: ADMIN_OAUTH_CLIENTS_QK, queryFn: fetchAdminOAuthClients })

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
      <AdminOAuthClientNewModal opened={newClientOpened} onClose={closeNewClient} />

      <Group justify="space-between" wrap="wrap">
        <Title order={2}>{t('adminTitleOAuthClients')}</Title>
        <Button type="button" leftSection={<IconPlus size={18} />} onClick={() => openNewClient()}>
          {t('adminOAuthNewClient')}
        </Button>
      </Group>

      {q.isPending ? (
        <Loader />
      ) : q.isError ? (
        <Anchor c="red">{t('adminOAuthClientsLoadFailed')}</Anchor>
      ) : (
        <Table.ScrollContainer
          minWidth={960}
          maw="100%"
          scrollAreaProps={{ scrollbars: 'x', type: 'auto' }}
        >
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('adminOAuthColId')}</Table.Th>
                <Table.Th>{t('adminOAuthClientName')}</Table.Th>
                <Table.Th>{t('adminOAuthColDescription')}</Table.Th>
                <Table.Th>{t('adminOAuthColPublic')}</Table.Th>
                <Table.Th>{t('adminOAuthColAccessibleGroups')}</Table.Th>
                <Table.Th>{t('adminOAuthColHomeUrl')}</Table.Th>
                <Table.Th>{t('adminUsersColActions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pageItems.map((c) => (
                <Table.Tr key={c.id}>
                  <Table.Td>{c.id}</Table.Td>
                  <Table.Td>{c.name}</Table.Td>
                  <Table.Td style={{ maxWidth: 280 }}>
                    {c.description?.trim() ? (
                      <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {c.description}
                      </Text>
                    ) : (
                      <Text size="sm" c="dimmed">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {c.is_public ? (
                      <Badge color="teal" variant="light">
                        {t('adminOAuthPublicYes')}
                      </Badge>
                    ) : (
                      <Badge color="gray" variant="light">
                        {t('adminOAuthPublicNo')}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td style={{ maxWidth: 320 }}>
                    <OAuthClientAccessibleGroupsCell client={c} t={t} />
                  </Table.Td>
                  <Table.Td>
                    <Anchor href={c.home_url} target="_blank" rel="noreferrer" size="sm">
                      {c.home_url}
                    </Anchor>
                  </Table.Td>
                  <Table.Td>
                    <Button
                      component={Link}
                      to={`/admin/oauth/clients/c/${c.id}`}
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
