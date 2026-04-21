'use client'

import { useEffect, useRef } from 'react'
import { watchPosition } from '@/lib/geolocation'
import { updateProviderLocation } from '@/lib/firestore'
import { useAuthStore } from '@/store/auth'

// Intervalo mínimo entre updates (ms) — no spamear Firestore
const UPDATE_INTERVAL_MS = 5000

export function useProviderLocation(active: boolean) {
  const user = useAuthStore((s) => s.user)
  const lastUpdateRef = useRef<number>(0)

  useEffect(() => {
    if (!active || !user?.uid) return

    const stopWatch = watchPosition(
      async (coords) => {
        const now = Date.now()
        if (now - lastUpdateRef.current < UPDATE_INTERVAL_MS) return
        lastUpdateRef.current = now

        try {
          await updateProviderLocation(user.uid, coords.lat, coords.lng)
        } catch {
          // Silencioso — no bloquear la UI por un fallo de geolocalización
        }
      },
      (err) => console.warn('GPS error:', err.message)
    )

    return stopWatch
  }, [active, user?.uid])
}
