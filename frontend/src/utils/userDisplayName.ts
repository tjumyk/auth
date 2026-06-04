export type UserDisplayFields = {
  name: string
  nickname?: string | null
  real_name?: string | null
}

export function getUserDisplayName(user: UserDisplayFields): string {
  const nick = user.nickname?.trim()
  if (nick) return nick
  const real = user.real_name?.trim()
  if (real) return real
  return user.name
}

export function getUserDisplayInitial(user: UserDisplayFields): string {
  const label = getUserDisplayName(user)
  return (label.trim().slice(0, 1) || '?').toUpperCase()
}
