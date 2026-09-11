import { Route, Routes } from 'react-router'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { PasswordExpiryPage } from '@/pages/PasswordExpiryPage'
import { mockWindowLocation, renderWithApp } from '@/test/renderApp'
import { server } from '@/test/msw/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('PasswordExpiryPage skip resume', () => {
  it('navigates home when skip has no intent client', async () => {
    renderWithApp(
      <Routes>
        <Route path="/" element={<div>auth-home</div>} />
        <Route path="/account/password-expiry" element={<PasswordExpiryPage />} />
      </Routes>,
      { router: { initialEntries: ['/account/password-expiry'] } },
    )

    await userEvent.click(screen.getByRole('button', { name: /Skip for now/i }))
    await waitFor(() => {
      expect(screen.getByText('auth-home')).toBeInTheDocument()
    })
  })

  it('redirects to target home_url when intent app is ip blocked', async () => {
    const location = mockWindowLocation()
    renderWithApp(<PasswordExpiryPage />, {
      router: { initialEntries: ['/account/password-expiry?intent_client_id=10'] },
    })

    await userEvent.click(screen.getByRole('button', { name: /Skip for now/i }))
    await waitFor(() => {
      expect(location.href).toBe('https://target.example/')
    })
  })

  it('redirects to target home_url when intent app is ip allowed', async () => {
    server.use(
      http.get('/api/account/ip-check', () =>
        HttpResponse.json({ check_pass: true, guarded_ports: [443] }),
      ),
    )
    const location = mockWindowLocation()
    renderWithApp(<PasswordExpiryPage />, {
      router: { initialEntries: ['/account/password-expiry?intent_client_id=10'] },
    })

    await userEvent.click(screen.getByRole('button', { name: /Skip for now/i }))
    await waitFor(() => {
      expect(location.href).toBe('https://target.example/')
    })
  })
})
