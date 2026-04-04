import { Group, Pagination, Select, Text } from '@mantine/core'
import type { ReactElement } from 'react'

import { useI18n } from '@/hooks/useI18n'
import {
  ADMIN_TABLE_PAGE_SIZE_OPTIONS,
  DEFAULT_ADMIN_TABLE_PAGE_SIZE,
} from '@/utils/adminTablePagination'

export type AdminTablePaginationControlsProps = {
  totalPages: number
  currentPage: number
  onPageChange: (page: number) => void
  pageSize: number
  onPageSizeChange: (size: number) => void
}

export function AdminTablePaginationControls({
  totalPages,
  currentPage,
  onPageChange,
  pageSize,
  onPageSizeChange,
}: AdminTablePaginationControlsProps): ReactElement {
  const { t } = useI18n()

  return (
    <Group justify="space-between" align="center" wrap="wrap" gap="md">
      <Pagination total={totalPages} value={currentPage} onChange={onPageChange} size="sm" />
      <Group gap="xs" align="center" wrap="nowrap">
        <Text size="sm" c="dimmed" visibleFrom="xs">
          {t('adminUsersPageSize')}
        </Text>
        <Select
          size="xs"
          w={90}
          aria-label={t('adminUsersPageSize')}
          data={[...ADMIN_TABLE_PAGE_SIZE_OPTIONS]}
          value={String(pageSize)}
          onChange={(v) => {
            const n = v ? Number.parseInt(v, 10) : DEFAULT_ADMIN_TABLE_PAGE_SIZE
            if (Number.isFinite(n) && n > 0) {
              onPageSizeChange(n)
            }
          }}
        />
      </Group>
    </Group>
  )
}
