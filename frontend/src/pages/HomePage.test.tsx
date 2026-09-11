import { Route, Routes } from 'react-router'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { HomePage } from '@/pages/HomePage'
import { mockWindowLocation, renderWithApp } from '@/test/renderApp'
import { server } from '@/test/msw/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('HomePage navigation', () => {
  it('opens target home_url when ip is blocked', async () => {
    const location = mockWindowLocation()
    renderWithApp(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText('target')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /target/i }))
    expect(location.href).toBe('https://target.example/')
  })

  it('opens gate home from banner', async () => {
    const location = mockWindowLocation()
    renderWithApp(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText(/Open gate to manage IP access/i)).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /Open gate to manage IP access/i }))
    expect(location.href).toBe('https://gate.example/')
  })

  it('navigates to password expiry when intercept is active', async () => {
    renderWithApp(
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/account/password-expiry" element={<div>expiry-intercept</div>} />
      </Routes>,
      {
        router: { initialEntries: ['/'] },
        user: {
          id: 1,
          name: 'tester',
          email: 'tester@example.com',
          nickname: null,
          avatar: null,
          is_active: true,
          is_two_factor_enabled: false,
          external_auth_enforced: false,
          password_expiry_intercept_active: true,
        },
      },
    )

    await waitFor(() => {
      expect(screen.getByText('target')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /target/i }))
    await waitFor(() => {
      expect(screen.getByText('expiry-intercept')).toBeInTheDocument()
    })
  })

  it('opens target home_url when ip check passes', async () => {
    server.use(
      http.get('/api/account/ip-check', () =>
        HttpResponse.json({ check_pass: true, guarded_ports: [443] }),
      ),
    )
    const location = mockWindowLocation()
    renderWithApp(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText('target')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /target/i }))
    expect(location.href).toBe('https://target.example/')
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
    const location = mockWindowLocation()
    renderWithApp(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText('target')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /target/i }))
    expect(location.href).toBe('https://target.example/')
  })
})
