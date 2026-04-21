'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapViewDynamic } from '@/components/map/MapViewDynamic'
import { useLocation } from '@/hooks/useLocation'
import { useProviders } from '@/hooks/useProviders'
import { useAuthStore } from '@/store/auth'
import { VerificationBanner } from '@/components/auth/VerificationBanner'
import { ProviderBottomSheet } from '@/components/services/ProviderBottomSheet'
import { BottomNav } from '@/components/layout/BottomNav'
import { Badge } from '@/components/ui/badge'
import type { Provider } from '@/types'

export default function OwnerHome() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const { userLocation } = useLocation(false)
  const providers = useProviders()
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  const availableCount = providers.filter((p) => p.isAvailable && p.currentLocation).length

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Banner de verificación pendiente */}
      {user?.verificationStatus !== 'approved' && (
        <div className="absolute top-0 left-0 right-0 z-30">
          <VerificationBanner status={user?.verificationStatus} />
        </div>
      )}

      {/* Header flotante */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-safe">
        <div
          className={`flex items-center justify-between px-4 py-3 ${
            user?.verificationStatus !== 'approved' ? 'mt-12' : ''
          }`}
        >
          <div className="bg-background/90 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border border-border">
            <span className="font-bold text-lg">
              Paw<span className="text-primary">Go</span>
            </span>
          </div>

          <div className="bg-background/90 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-lg border border-border flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium">{availableCount} disponibles</span>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="px-4 pb-2">
          <button
            onClick={() => router.push('/request/walk')}
            className="w-full bg-background/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg border border-border text-left flex items-center gap-3"
          >
            <span className="text-xl">🔍</span>
            <span className="text-muted-foreground text-sm">
              ¿Qué servicio necesitás?
            </span>
          </button>
        </div>
      </div>

      {/* Mapa — ocupa toda la pantalla */}
      <MapViewDynamic
        userLocation={userLocation}
        providers={providers}
        onProviderClick={setSelectedProvider}
        radiusKm={3}
        className="h-full w-full"
      />

      {/* Botones de servicios (floating) */}
      <div className="absolute bottom-24 left-0 right-0 z-20 px-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <ServiceChip
            emoji="🦮"
            label="Paseo"
            onClick={() => router.push('/request/walk')}
          />
          <ServiceChip
            emoji="🏥"
            label="Veterinaria"
            onClick={() => router.push('/request/vet_transfer')}
          />
          <ServiceChip
            emoji="🚗"
            label="Transporte"
            onClick={() => router.push('/request/pet_transport')}
          />
        </div>
      </div>

      {/* Bottom sheet del proveedor seleccionado */}
      {selectedProvider && (
        <ProviderBottomSheet
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
          onRequest={() => {
            setSelectedProvider(null)
            router.push(`/request/walk?providerId=${selectedProvider.uid}`)
          }}
        />
      )}

      {/* Navegación inferior */}
      <BottomNav active="home" />
    </div>
  )
}

function ServiceChip({
  emoji,
  label,
  onClick,
}: {
  emoji: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 bg-background/95 backdrop-blur-sm border border-border rounded-full px-4 py-2 shadow-md whitespace-nowrap hover:border-primary hover:bg-primary/5 transition-all"
    >
      <span>{emoji}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
