/** Shared client-side pagination for admin list tables (users, groups, OAuth clients). */

export const ADMIN_TABLE_PAGE_SIZE_OPTIONS = ['10', '15', '25', '50', '100'] as const

export const DEFAULT_ADMIN_TABLE_PAGE_SIZE = 15

export type AdminTablePaginationSlice<T> = {
  totalPages: number
  currentPage: number
  pageOffset: number
  pageItems: T[]
  rangeFrom: number
  rangeTo: number
}

export function computeAdminTablePagination<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): AdminTablePaginationSlice<T> {
  const len = items.length
  const totalPages = Math.max(1, Math.ceil(len / pageSize))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const pageOffset = (currentPage - 1) * pageSize
  const pageItems = items.slice(pageOffset, pageOffset + pageSize)
  const rangeFrom = len === 0 ? 0 : pageOffset + 1
  const rangeTo = pageOffset + pageItems.length
  return { totalPages, currentPage, pageOffset, pageItems, rangeFrom, rangeTo }
}
