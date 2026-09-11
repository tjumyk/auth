import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { HomePage } from '@/pages/HomePage'
import { renderWithApp } from '@/test/renderApp'
import { server } from '@/test/msw/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('HomePage navigation', () => {
  it('links blocked apps to target home_url', async () => {
    renderWithApp(<HomePage />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /target/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: /target/i })).toHaveAttribute(
      'href',
      'https://target.example/',
    )
  })

  it('links gate banner to gate home', async () => {
    renderWithApp(<HomePage />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Open gate to manage IP access/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: /Open gate to manage IP access/i })).toHaveAttribute(
      'href',
      'https://gate.example/',
    )
  })

  it('links target home_url when ip check passes', async () => {
    server.use(
      http.get('/api/account/ip-check', () =>
        HttpResponse.json({ check_pass: true, guarded_ports: [443] }),
      ),
    )
    renderWithApp(<HomePage />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /target/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: /target/i })).toHaveAttribute(
      'href',
      'https://target.example/',
    )
  })

  it('falls back to direct home_url when gate client is missing', async () => {
    server.use(
      http.get('/api/account/clients', () =>
        HttpResponse.json([
          {
            id: 10,
            name: 'target',
            is_public: true,
            home_url: 'https://target.example/',
            description: null,
            icon: null,
          },
        ]),
      ),
    )
    renderWithApp(<HomePage />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /target/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: /target/i })).toHaveAttribute(
      'href',
      'https://target.example/',
    )
  })
})
