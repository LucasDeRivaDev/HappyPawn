'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapViewDynamic } from '@/components/map/MapViewDynamic'
import { useLocation } from '@/hooks/useLocation'
import { useProviderLocation } from '@/hooks/useProviderLocation'
import { useAuthStore } from '@/store/auth'
import { updateProvider } from '@/lib/firestore'
import { subscribeToNearbyRequests } from '@/lib/firestore'
import { BottomNav } from '@/components/layout/BottomNav'
import { VerificationBanner } from '@/components/auth/VerificationBanner'
import { DebtBanner } from '@/components/payments/DebtBanner'
import { NearbyRequestCard } from '@/components/services/NearbyRequestCard'
import { formatPrice } from '@/lib/pricing'
import { toast } from 'sonner'
import type { Service } from '@/types'

export default function ProviderDashboard() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const provider = useAuthStore((s) => s.provider)
  const authLoading = useAuthStore((s) => s.loading)
  const [isAvailable, setIsAvailable] = useState(provider?.isAvailable ?? false)
  const [toggling, setToggling] = useState(false)
  const [nearbyRequests, setNearbyRequests] = useState<Service[]>([])

  const { userLocation } = useLocation(false)

  // Actualizar GPS en Firestore cada 5 segundos cuando está disponible
  useProviderLocation(isAvailable)

  // Escuchar solicitudes cercanas en tiempo real
  useEffect(() => {
    const unsub = subscribeToNearbyRequests((services) => {
      setNearbyRequests(services)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [user, authLoading, router])

  async function toggleAvailability() {
    if (!user?.uid) return
    setToggling(true)
    try {
      const next = !isAvailable
      await updateProvider(user.uid, { isAvailable: next })
      setIsAvailable(next)
      toast.success(next ? 'Estás disponible — aparecés en el mapa' : 'Desactivaste tu disponibilidad')
    } catch {
      toast.error('Error al actualizar disponibilidad')
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Banners */}
      {user?.verificationStatus !== 'approved' && (
        <div className="absolute top-0 left-0 right-0 z-30">
          <VerificationBanner status={user?.verificationStatus} />
        </div>
      )}

      {/* Header flotante */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-safe">
        <div className={`px-4 py-3 ${user?.verificationStatus !== 'approved' ? 'mt-12' : ''}`}>
          {/* Toggle disponible */}
          <div className="bg-background/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg border border-border flex items-center justify-between">
            <div>
              <p className="font-bold">
                {isAvailable ? '🟢 Disponible' : '⚫ No disponible'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isAvailable
                  ? 'Aparecés en el mapa de clientes'
                  : 'Los clientes no te ven'}
              </p>
            </div>

            <button
              onClick={toggleAvailability}
              disabled={toggling}
              className={`w-14 h-7 rounded-full transition-colors relative ${
                isAvailable ? 'bg-green-500' : 'bg-muted'
              }`}
            >
              <div
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  isAvailable ? 'translate-x-7' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mapa */}
      <MapViewDynamic
        userLocation={userLocation}
        providers={[]}
        className="h-full w-full"
      />

      {/* Panel de solicitudes cercanas */}
      {isAvailable && nearbyRequests.length > 0 && (
        <div className="absolute bottom-20 left-0 right-0 z-20 px-4 space-y-2 max-h-72 overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Solicitudes cercanas
          </p>
          {nearbyRequests.map((req) => (
            <NearbyRequestCard
              key={req.id}
              service={req}
              onAccept={() => router.push(`/active-service?serviceId=${req.id}`)}
            />
          ))}
        </div>
      )}

      {/* Deuda pendiente */}
      <DebtBanner />

      <BottomNav active="dashboard" />
    </div>
  )
}
