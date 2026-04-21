'use client'

import { useEffect, useCallback } from 'react'
import { getCurrentPosition, watchPosition, type Coords } from '@/lib/geolocation'
import { useServiceStore } from '@/store/service'

export function useLocation(autoWatch = false) {
  const { userLocation, setUserLocation } = useServiceStore()

  const fetchOnce = useCallback(async () => {
    try {
      const coords = await getCurrentPosition()
      setUserLocation(coords)
      return coords
    } catch {
      return null
    }
  }, [setUserLocation])

  useEffect(() => {
    if (!autoWatch) {
      fetchOnce()
      return
    }

    const stop = watchPosition(
      (coords: Coords) => setUserLocation(coords),
      () => {}
    )
    return stop
  }, [autoWatch, fetchOnce, setUserLocation])

  return { userLocation, fetchOnce }
}
