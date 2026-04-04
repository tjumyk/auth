import { createContext } from 'react'

import type { User } from '@/models/user'

export const AuthUserContext = createContext<User | null>(null)
