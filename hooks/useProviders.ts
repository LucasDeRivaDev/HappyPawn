'use client'

import { useEffect } from 'react'
import { subscribeToAvailableProviders } from '@/lib/firestore'
import { useServiceStore } from '@/store/service'

export function useProviders() {
  const { availableProviders, setAvailableProviders } = useServiceStore()

  useEffect(() => {
    const unsubscribe = subscribeToAvailableProviders((providers) => {
      setAvailableProviders(providers)
    })
    return unsubscribe
  }, [setAvailableProviders])

  return availableProviders
}
