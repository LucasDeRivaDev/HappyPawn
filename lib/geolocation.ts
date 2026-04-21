export interface Coords {
  lat: number
  lng: number
}

// ─── Get current position ────────────────────────────────────────────────────

export function getCurrentPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation no disponible en este dispositivo.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(`Error de geolocalización: ${err.message}`)),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  })
}

// ─── Watch position (para tracking en tiempo real) ──────────────────────────

export function watchPosition(
  onUpdate: (coords: Coords) => void,
  onError?: (error: Error) => void
): () => void {
  if (!navigator.geolocation) {
    onError?.(new Error('Geolocation no disponible.'))
    return () => {}
  }

  const watchId = navigator.geolocation.watchPosition(
    (pos) => onUpdate({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    (err) => onError?.(new Error(err.message)),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
  )

  return () => navigator.geolocation.clearWatch(watchId)
}

// ─── Geocoding con Nominatim (OpenStreetMap, gratuito) ───────────────────────

export async function geocodeAddress(address: string): Promise<Coords | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    address
  )}&format=json&limit=1&countrycodes=ar`

  const res = await fetch(url, {
    headers: { 'Accept-Language': 'es', 'User-Agent': 'PawGo/1.0' },
  })

  if (!res.ok) return null

  const data = await res.json()
  if (!data.length) return null

  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
}

export async function reverseGeocode(coords: Coords): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json`

  const res = await fetch(url, {
    headers: { 'Accept-Language': 'es', 'User-Agent': 'PawGo/1.0' },
  })

  if (!res.ok) return null

  const data = await res.json()
  return data.display_name ?? null
}

// ─── Distancia entre dos puntos (Haversine) ──────────────────────────────────

export function calculateDistance(a: Coords, b: Coords): number {
  const R = 6371 // km
  const dLat = deg2rad(b.lat - a.lat)
  const dLng = deg2rad(b.lng - a.lng)
  const sin = Math.sin
  const cos = Math.cos
  const h =
    sin(dLat / 2) ** 2 + cos(deg2rad(a.lat)) * cos(deg2rad(b.lat)) * sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(h))
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180)
}

// ─── Filtrar proveedores dentro del radio ─────────────────────────────────────

export function filterProvidersByRadius<T extends { currentLocation?: { latitude: number; longitude: number } }>(
  providers: T[],
  center: Coords,
  radiusKm: number
): T[] {
  return providers.filter((p) => {
    if (!p.currentLocation) return false
    const dist = calculateDistance(center, {
      lat: p.currentLocation.latitude,
      lng: p.currentLocation.longitude,
    })
    return dist <= radiusKm
  })
}
