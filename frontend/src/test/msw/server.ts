import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const sampleClients = [
  {
    id: 1,
    name: 'gate',
    is_public: true,
    home_url: 'https://gate.example/',
    description: null,
    icon: null,
  },
  {
    id: 10,
    name: 'target',
    is_public: true,
    home_url: 'https://target.example/',
    description: null,
    icon: null,
  },
]

export const handlers = [
  http.get('/api/account/clients', () => HttpResponse.json(sampleClients)),
  http.get('/api/account/ip-check', () =>
    HttpResponse.json({ check_pass: false, guarded_ports: [443] }),
  ),
  http.get('/api/meta/time', () =>
    HttpResponse.json({ unix_time: Math.floor(Date.now() / 1000) }),
  ),
  http.post('/api/account/password-expiry/skip', () =>
    HttpResponse.json({
      id: 1,
      name: 'tester',
      email: 'tester@example.com',
      nickname: null,
      avatar: null,
      is_active: true,
      is_two_factor_enabled: false,
      external_auth_enforced: false,
      password_expiry_intercept_active: false,
    }),
  ),
]

export const server = setupServer(...handlers)

export { sampleClients }
