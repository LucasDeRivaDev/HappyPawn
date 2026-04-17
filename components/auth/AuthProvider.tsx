'use client'

import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getUser, getProvider } from '@/lib/firestore'
import { useAuthStore } from '@/store/auth'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProvider, setLoading } = useAuthStore()

  usePushNotifications()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setProvider(null)
        setLoading(false)
        return
      }

      try {
        const [userData, providerData] = await Promise.all([
          getUser(firebaseUser.uid),
          getProvider(firebaseUser.uid),
        ])
        setUser(userData)
        setProvider(providerData)
      } catch {
        setUser(null)
        setProvider(null)
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [setUser, setProvider, setLoading])

  return <>{children}</>
}
