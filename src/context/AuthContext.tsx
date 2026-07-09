import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export interface UserProfile {
  full_name: string
  username: string
  role: string
}

export interface AuthContextType {
  session: Session | null
  profile: UserProfile | null
  loading: boolean
}

export const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  loading: true,
})
