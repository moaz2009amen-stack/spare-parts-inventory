import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { AuthContext, type UserProfile } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const hasLoggedLogin = useRef(false)

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('full_name, username, role')
      .eq('id', userId)
      .single()

    if (data) setProfile(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadProfile(data.session.user.id)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (session) {
        loadProfile(session.user.id)
        // سجّل الدخول مرة واحدة بس لكل جلسة فعلية (مش كل مرة يجدد التوكن)
        if (event === 'SIGNED_IN' && !hasLoggedLogin.current) {
          hasLoggedLogin.current = true
          supabase.rpc('log_activity', { p_action: 'تسجيل دخول للنظام' })
        }
      } else {
        setProfile(null)
        hasLoggedLogin.current = false
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, profile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
