import type { AdminUser } from '@/models/admin'
import type { BasicError } from '@/models/apiError'

export type BatchListFormat = 'csv' | 'tsv' | 'json'

export type BatchUserForm = { name: string; email: string }

export type BatchUserListRow = {
  clientError?: BasicError
  form?: BatchUserForm
  user?: AdminUser | null
  serverError?: BasicError | null
  success?: string | null
  processing?: boolean
  waiting?: boolean
}

function createItem(name: string, email: string | undefined, emailPrefix: string, emailSuffix: string): BatchUserForm {
  const n = name.trim()
  if (!n) {
    throw new Error('Name is required')
  }
  const em =
    email !== undefined && email.trim() !== ''
      ? email.trim()
      : `${emailPrefix}${n}${emailSuffix}`
  return { name: n, email: em }
}

function parseLines(rawList: string, columnSplitter: string, emailPrefix: string, emailSuffix: string): BatchUserListRow[] {
  const items: BatchUserListRow[] = []
  let lineNum = 0
  for (const rawLine of rawList.split('\n')) {
    lineNum += 1
    const line = rawLine.trim()
    if (!line) {
      continue
    }
    try {
      const columns = line.split(columnSplitter)
      let name = columns[0]
      if (name) {
        name = name.trim()
      }
      let email = columns[1]
      if (email) {
        email = email.trim()
      }
      items.push({ form: createItem(name, email, emailPrefix, emailSuffix) })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      items.push({
        clientError: { msg: `[Parse Error] ${msg} (Line: ${lineNum})` },
      })
    }
  }
  return items
}

function parseJson(rawList: string, emailPrefix: string, emailSuffix: string): BatchUserListRow[] {
  try {
    const json: unknown = JSON.parse(rawList)
    if (!Array.isArray(json)) {
      return [{ clientError: { msg: '[Parse Error] Not a JSON list' } }]
    }
    const items: BatchUserListRow[] = []
    for (const obj of json) {
      try {
        if (typeof obj !== 'object' || obj === null || !('name' in obj)) {
          throw new Error('Each entry must be an object with a name field')
        }
        const rec = obj as { name?: unknown; email?: unknown }
        const name = typeof rec.name === 'string' ? rec.name : ''
        const email = typeof rec.email === 'string' ? rec.email : undefined
        items.push({ form: createItem(name, email, emailPrefix, emailSuffix) })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        items.push({ clientError: { msg: `[Parse Error] ${msg}` } })
      }
    }
    return items
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return [{ clientError: { msg: `[Parse Error] ${msg}` } }]
  }
}

/**
 * Parse admin batch user list (CSV / TSV / JSON) into rows for preview and bulk operations.
 */
export function parseBatchUserList(
  rawList: string,
  format: BatchListFormat,
  emailPrefix: string,
  emailSuffix: string,
): BatchUserListRow[] {
  if (!rawList.trim()) {
    return []
  }
  if (format === 'csv') {
    return parseLines(rawList, ',', emailPrefix, emailSuffix)
  }
  if (format === 'tsv') {
    return parseLines(rawList, '\t', emailPrefix, emailSuffix)
  }
  if (format === 'json') {
    return parseJson(rawList, emailPrefix, emailSuffix)
  }
  return [{ clientError: { msg: 'Unsupported format', detail: format } }]
}

export function batchRowsHaveClientErrors(rows: BatchUserListRow[]): boolean {
  return rows.some((r) => r.clientError !== undefined)
}
