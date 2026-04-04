import { describe, expect, it } from 'vitest'

import {
  AdminGroupSchema,
  AdminOAuthClientSchema,
  AdminUserListEnvelopeSchema,
  AdminUserSchema,
  OAuthAuthorizationSchema,
} from '@/models/admin'

describe('admin models', () => {
  it('parses user list envelope and merge shape', () => {
    const raw = {
      users: [
        {
          id: 1,
          name: 'alice',
          email: 'a@example.com',
          nickname: null,
          avatar: null,
          is_active: true,
          is_two_factor_enabled: false,
          external_auth_provider_id: null,
          external_auth_enforced: false,
          group_ids: [1],
          created_at: '2024-01-01T00:00:00',
          modified_at: '2024-01-02T00:00:00',
          email_confirmed_at: null,
          is_email_confirmed: false,
        },
      ],
      groups: [
        {
          id: 1,
          name: 'admin',
          description: 'Admins',
          created_at: '2024-01-01T00:00:00',
          modified_at: '2024-01-01T00:00:00',
        },
      ],
    }
    const r = AdminUserListEnvelopeSchema.safeParse(raw)
    expect(r.success).toBe(true)
  })

  it('parses admin user with authorizations', () => {
    const raw = {
      id: 2,
      name: 'bob',
      email: 'b@example.com',
      is_active: true,
      is_two_factor_enabled: true,
      external_auth_enforced: false,
      created_at: '2024-01-01T00:00:00',
      modified_at: '2024-01-01T00:00:00',
      is_email_confirmed: true,
      authorizations: [
        {
          client_id: 3,
          user_id: 2,
          created_at: '2024-01-01T00:00:00',
          modified_at: '2024-01-01T00:00:00',
          client: {
            id: 3,
            name: 'app',
            is_public: true,
            home_url: 'https://app.example',
            description: null,
            icon: null,
          },
        },
      ],
    }
    const r = AdminUserSchema.safeParse(raw)
    expect(r.success).toBe(true)
  })

  it('parses OAuth authorization with user', () => {
    const raw = {
      client_id: 1,
      user_id: 2,
      created_at: '2024-01-01T00:00:00',
      modified_at: '2024-01-01T00:00:00',
      user: { id: 2, name: 'bob', email: 'b@example.com' },
    }
    expect(OAuthAuthorizationSchema.safeParse(raw).success).toBe(true)
  })

  it('parses admin OAuth client', () => {
    const raw = {
      id: 1,
      name: 'cli',
      secret: 's3cret',
      redirect_url: 'https://app/cb',
      home_url: 'https://app',
      is_public: false,
      description: 'x',
      icon: null,
      created_at: '2024-01-01T00:00:00',
      modified_at: '2024-01-01T00:00:00',
      allowed_groups: [{ id: 1, name: 'g', description: null }],
    }
    expect(AdminOAuthClientSchema.safeParse(raw).success).toBe(true)
  })

  it('parses admin group', () => {
    const raw = {
      id: 1,
      name: 'staff',
      description: 'Staff',
      created_at: '2024-01-01T00:00:00',
      modified_at: '2024-01-01T00:00:00',
    }
    expect(AdminGroupSchema.safeParse(raw).success).toBe(true)
  })
})
