import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  isHttpHostedPage,
  isLocalDevHost,
  shouldWarnAdminInsecureHttp,
} from '@/utils/isHttpHostedPage'

describe('isLocalDevHost', () => {
  it('accepts localhost and loopback', () => {
    expect(isLocalDevHost('localhost')).toBe(true)
    expect(isLocalDevHost('app.localhost')).toBe(true)
    expect(isLocalDevHost('127.0.0.1')).toBe(true)
    expect(isLocalDevHost('127.0.0.2')).toBe(true)
    expect(isLocalDevHost('::1')).toBe(true)
    expect(isLocalDevHost('0.0.0.0')).toBe(true)
  })

  it('accepts private LAN ranges', () => {
    expect(isLocalDevHost('10.0.0.5')).toBe(true)
    expect(isLocalDevHost('192.168.1.10')).toBe(true)
    expect(isLocalDevHost('172.16.0.1')).toBe(true)
    expect(isLocalDevHost('172.31.255.255')).toBe(true)
  })

  it('rejects public hosts', () => {
    expect(isLocalDevHost('example.com')).toBe(false)
    expect(isLocalDevHost('218.203.49.138')).toBe(false)
    expect(isLocalDevHost('172.32.0.1')).toBe(false)
  })
})

describe('isHttpHostedPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns true for http:', () => {
    vi.stubGlobal('location', { protocol: 'http:', hostname: 'localhost' })
    expect(isHttpHostedPage()).toBe(true)
  })

  it('returns false for https:', () => {
    vi.stubGlobal('location', { protocol: 'https:', hostname: 'localhost' })
    expect(isHttpHostedPage()).toBe(false)
  })
})

describe('shouldWarnAdminInsecureHttp', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('passes (no warn) for http on local/dev hosts', () => {
    vi.stubGlobal('location', { protocol: 'http:', hostname: 'localhost' })
    expect(shouldWarnAdminInsecureHttp()).toBe(false)

    vi.stubGlobal('location', { protocol: 'http:', hostname: '127.0.0.1' })
    expect(shouldWarnAdminInsecureHttp()).toBe(false)

    vi.stubGlobal('location', { protocol: 'http:', hostname: '192.168.0.10' })
    expect(shouldWarnAdminInsecureHttp()).toBe(false)
  })

  it('warns for http on public hosts', () => {
    vi.stubGlobal('location', { protocol: 'http:', hostname: '218.203.49.138' })
    expect(shouldWarnAdminInsecureHttp()).toBe(true)

    vi.stubGlobal('location', { protocol: 'http:', hostname: 'id.example.com' })
    expect(shouldWarnAdminInsecureHttp()).toBe(true)
  })

  it('passes for https regardless of host', () => {
    vi.stubGlobal('location', { protocol: 'https:', hostname: '218.203.49.138' })
    expect(shouldWarnAdminInsecureHttp()).toBe(false)
  })
})
