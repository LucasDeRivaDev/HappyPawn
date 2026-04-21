'use client'

import { useEffect } from 'react'
import { subscribeToService } from '@/lib/firestore'
import { useServiceStore } from '@/store/service'

export function useService(serviceId: string | null) {
  const { activeService, setActiveService } = useServiceStore()

  useEffect(() => {
    if (!serviceId) return
    const unsub = subscribeToService(serviceId, (service) => {
      setActiveService(service)
    })
    return unsub
  }, [serviceId, setActiveService])

  return activeService
}
