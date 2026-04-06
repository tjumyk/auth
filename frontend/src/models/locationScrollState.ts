/** `location.state` for in-app navigation (e.g. legacy /settings/* redirects). */
export type ProfileScrollSection = 'account-details' | 'avatar' | 'password'

export type AppLocationScrollState = {
  scrollTo?: ProfileScrollSection
}

export const PROFILE_SECTION_DOM_IDS: Record<ProfileScrollSection, string> = {
  'account-details': 'profile-account-details',
  avatar: 'profile-avatar',
  password: 'profile-password',
}
