import type { User } from '@/models/user'

export function isAdmin(user: Pick<User, 'groups'>): boolean {
  return user.groups?.some((g) => g.name === 'admin') ?? false
}
