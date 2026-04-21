'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import type { Provider } from '@/types'
import type { Coords } from '@/lib/geolocation'

interface MapViewProps {
  userLocation: Coords | null
  providers: Provider[]
  onProviderClick?: (provider: Provider) => void
  trackingCoords?: Coords | null
  routePoints?: Coords[]
  radiusKm?: number
  className?: string
}

export function MapView({
  userLocation,
  providers,
  onProviderClick,
  trackingCoords,
  routePoints,
  radiusKm,
  className = '',
}: MapViewProps) {
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<any[]>([])
  const trackingMarkerRef = useRef<any>(null)
  const routeLayerRef = useRef<any>(null)
  const circleRef = useRef<any>(null)

  // Inicializar el mapa
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (mapRef.current) return
    if (!mapContainerRef.current) return

    const L = require('leaflet')

    const defaultCenter: [number, number] = userLocation
      ? [userLocation.lat, userLocation.lng]
      : [-31.6333, -60.7] // Santo Tomé, Santa Fe

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 14,
      zoomControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    // Control de zoom arriba a la derecha
    L.control.zoom({ position: 'topright' }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Actualizar posición del usuario
  useEffect(() => {
    if (!mapRef.current || !userLocation) return
    const L = require('leaflet')

    // Marcador del usuario (punto azul)
    const userIcon = L.divIcon({
      html: `<div style="
        width:16px;height:16px;border-radius:50%;
        background:#00B4D8;border:3px solid white;
        box-shadow:0 0 0 3px rgba(0,180,216,0.3)
      "></div>`,
      className: '',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    })

    if ((mapRef.current as any)._userMarker) {
      ;(mapRef.current as any)._userMarker.setLatLng([userLocation.lat, userLocation.lng])
    } else {
      const marker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(
        mapRef.current
      )
      ;(mapRef.current as any)._userMarker = marker
    }

    // Radio de búsqueda
    if (radiusKm) {
      if (circleRef.current) circleRef.current.remove()
      circleRef.current = L.circle([userLocation.lat, userLocation.lng], {
        radius: radiusKm * 1000,
        color: '#FF6B35',
        fillColor: '#FF6B35',
        fillOpacity: 0.05,
        weight: 1,
        dashArray: '5,5',
      }).addTo(mapRef.current)
    }

    mapRef.current.setView([userLocation.lat, userLocation.lng], 14)
  }, [userLocation, radiusKm])

  // Actualizar marcadores de proveedores
  useEffect(() => {
    if (!mapRef.current) return
    const L = require('leaflet')

    // Limpiar marcadores anteriores
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    providers.forEach((provider) => {
      if (!provider.currentLocation) return

      const { latitude: lat, longitude: lng } = provider.currentLocation as any

      const isWalker = provider.services?.includes('walk')
      const emoji = isWalker ? '🦮' : '🚗'
      const color = '#FF6B35'

      const icon = L.divIcon({
        html: `<div style="
          background:${color};color:white;
          width:36px;height:36px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:18px;border:2px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          cursor:pointer;
        ">${emoji}</div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })

      const marker = L.marker([lat, lng], { icon }).addTo(mapRef.current)

      if (onProviderClick) {
        marker.on('click', () => onProviderClick(provider))
      }

      markersRef.current.push(marker)
    })
  }, [providers, onProviderClick])

  // Tracking en tiempo real del proveedor asignado
  useEffect(() => {
    if (!mapRef.current) return
    const L = require('leaflet')

    if (!trackingCoords) {
      if (trackingMarkerRef.current) {
        trackingMarkerRef.current.remove()
        trackingMarkerRef.current = null
      }
      return
    }

    const icon = L.divIcon({
      html: `<div style="
        background:#FF6B35;color:white;
        width:44px;height:44px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:22px;border:3px solid white;
        box-shadow:0 4px 12px rgba(255,107,53,0.5);
        animation: pulse 1.5s infinite;
      ">🦮</div>`,
      className: '',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    })

    if (trackingMarkerRef.current) {
      trackingMarkerRef.current.setLatLng([trackingCoords.lat, trackingCoords.lng])
    } else {
      trackingMarkerRef.current = L.marker(
        [trackingCoords.lat, trackingCoords.lng],
        { icon }
      ).addTo(mapRef.current)
    }
  }, [trackingCoords])

  // Dibujar ruta recorrida
  useEffect(() => {
    if (!mapRef.current) return
    const L = require('leaflet')

    if (routeLayerRef.current) {
      routeLayerRef.current.remove()
      routeLayerRef.current = null
    }

    if (!routePoints || routePoints.length < 2) return

    routeLayerRef.current = L.polyline(
      routePoints.map((p) => [p.lat, p.lng]),
      { color: '#FF6B35', weight: 4, opacity: 0.8, lineCap: 'round' }
    ).addTo(mapRef.current)
  }, [routePoints])

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .leaflet-container { font-family: inherit; }
      `}</style>
      <div className={`${className}`} style={{ isolation: 'isolate', minHeight: 300 }}>
        <div
          ref={mapContainerRef}
          className="w-full h-full"
          style={{ minHeight: 300 }}
        />
      </div>
    </>
  )
}
