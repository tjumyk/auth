import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react'

import {
  computeAdminTablePagination,
  DEFAULT_ADMIN_TABLE_PAGE_SIZE,
} from '@/utils/adminTablePagination'

export function useAdminTablePagination<T>(
  items: readonly T[],
  initialPageSize: number = DEFAULT_ADMIN_TABLE_PAGE_SIZE,
): {
  setPage: Dispatch<SetStateAction<number>>
  pageSize: number
  setPageSize: (n: number) => void
  pageItems: T[]
  totalPages: number
  currentPage: number
  rangeFrom: number
  rangeTo: number
  totalCount: number
} {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(initialPageSize)

  const setPageSize = useCallback((n: number) => {
    if (Number.isFinite(n) && n > 0) {
      setPageSizeState(n)
      setPage(1)
    }
  }, [])

  const totalCount = items.length

  const { totalPages, currentPage, pageItems, rangeFrom, rangeTo } = useMemo(
    () => computeAdminTablePagination(items, page, pageSize),
    [items, page, pageSize],
  )

  return { setPage, pageSize, setPageSize, pageItems, totalPages, currentPage, rangeFrom, rangeTo, totalCount }
}
