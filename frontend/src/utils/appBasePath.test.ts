import { describe, expect, it, vi } from 'vitest'

import { withAppBasePath } from '@/utils/appBasePath'

describe('withAppBasePath', () => {
  it('returns path unchanged at root base', () => {
    vi.stubEnv('BASE_URL', '/')
    expect(withAppBasePath('/api/account/whoami')).toBe('/api/account/whoami')
    vi.unstubAllEnvs()
  })

  it('prefixes path with subpath base', () => {
    vi.stubEnv('BASE_URL', '/id/')
    expect(withAppBasePath('/api/account/whoami')).toBe('/id/api/account/whoami')
    expect(withAppBasePath('/upload/avatar/x.png')).toBe('/id/upload/avatar/x.png')
    vi.unstubAllEnvs()
  })

  it('leaves relative paths unchanged', () => {
    vi.stubEnv('BASE_URL', '/id/')
    expect(withAppBasePath('api/account/whoami')).toBe('api/account/whoami')
    vi.unstubAllEnvs()
  })
})
