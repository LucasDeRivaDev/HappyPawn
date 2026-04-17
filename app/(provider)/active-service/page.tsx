'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MapViewDynamic } from '@/components/map/MapViewDynamic'
import { useAuthStore } from '@/store/auth'
import { useLocation } from '@/hooks/useLocation'
import { useProviderLocation } from '@/hooks/useProviderLocation'
import {
  subscribeToService,
  updateServiceStatus,
  updateService,
  getUser,
} from '@/lib/firestore'
import { formatPrice } from '@/lib/pricing'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { Service, User } from '@/types'
import { GeoPoint } from 'firebase/firestore'

const SERVICE_LABELS: Record<string, { emoji: string; label: string }> = {
  walk: { emoji: '🦮', label: 'Paseo' },
  vet_transfer: { emoji: '🏥', label: 'Traslado' },
  pet_transport: { emoji: '🚗', label: 'Transporte' },
}

export default function ProviderActiveServicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const serviceId = searchParams.get('serviceId')
  const user = useAuthStore((s) => s.user)

  const [service, setService] = useState<Service | null>(null)
  const [owner, setOwner] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)

  const { userLocation } = useLocation(true)
  useProviderLocation(true)

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (!serviceId) { router.replace('/dashboard'); return }

    const unsub = subscribeToService(serviceId, (svc) => {
      setService(svc)
      if (svc?.status === 'completed' || svc?.status === 'cancelled') {
        router.replace('/dashboard')
      }
    })
    return unsub
  }, [user, serviceId, router])

  useEffect(() => {
    if (service?.ownerId) {
      getUser(service.ownerId).then(setOwner)
    }
  }, [service?.ownerId])

  async function handleAccept() {
    if (!serviceId || !user || !userLocation) return
    setLoading(true)
    try {
      await updateServiceStatus(serviceId, 'accepted', user.uid, 'Aceptado por proveedor')
      await updateService(serviceId, { providerId: user.uid })
      toast.success('Servicio aceptado — andá al punto de encuentro')

      // Notificar al owner
      if (service?.ownerId) {
        const serviceInfo = SERVICE_LABELS[service.serviceType] ?? { emoji: '🐾', label: 'Servicio' }
        fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toUid: service.ownerId,
            title: `${serviceInfo.emoji} ¡Tu solicitud fue aceptada!`,
            body: 'El proveedor está en camino. Podés seguirlo en el mapa.',
            data: { serviceId: serviceId ?? '' },
          }),
        }).catch(() => {}) // silencioso si falla
      }
    } catch {
      toast.error('Error al aceptar el servicio')
    } finally {
      setLoading(false)
    }
  }

  async function handleOnWay() {
    if (!serviceId || !user) return
    setLoading(true)
    try {
      await updateServiceStatus(serviceId, 'provider_on_way', user.uid, 'Proveedor en camino')
      toast.success('Avisaste que estás en camino')
    } catch {
      toast.error('Error al actualizar estado')
    } finally {
      setLoading(false)
    }
  }

  async function handleStart() {
    if (!serviceId || !user || !userLocation) return
    setLoading(true)
    try {
      await updateServiceStatus(serviceId, 'in_progress', user.uid, 'Servicio iniciado')
      await updateService(serviceId, {
        startedAt: null as any,
        route: [new GeoPoint(userLocation.lat, userLocation.lng)],
      })
      toast.success('¡Servicio iniciado!')
    } catch {
      toast.error('Error al iniciar el servicio')
    } finally {
      setLoading(false)
    }
  }

  async function handleComplete() {
    if (!serviceId || !user) return
    setLoading(true)
    try {
      await updateServiceStatus(serviceId, 'completed', user.uid, 'Servicio completado')
      await updateService(serviceId, { finishedAt: null as any })

      // Si fue efectivo, agregar deuda de comisión
      if (service?.paymentMethod === 'cash') {
        const { updateProvider } = await import('@/lib/firestore')
        const { getProvider } = await import('@/lib/firestore')
        const provider = await getProvider(user.uid)
        const commissionDebt = service.commissionAmount
        await updateProvider(user.uid, {
          pendingCommissionDebt: (provider?.pendingCommissionDebt ?? 0) + commissionDebt,
          totalEarnings: (provider?.totalEarnings ?? 0) + service.finalPrice - commissionDebt,
        })
      }

      toast.success('¡Servicio completado! 🎉')
      router.replace('/dashboard')
    } catch {
      toast.error('Error al completar el servicio')
    } finally {
      setLoading(false)
    }
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl animate-spin">🐾</div>
          <p className="text-muted-foreground mt-2">Cargando...</p>
        </div>
      </div>
    )
  }

  const meta = SERVICE_LABELS[service.serviceType] ?? SERVICE_LABELS.walk
  const ownerCoords = service.originCoords
    ? { lat: service.originCoords.latitude, lng: service.originCoords.longitude }
    : null

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Mapa */}
      <MapViewDynamic
        userLocation={userLocation}
        providers={[]}
        className="h-full w-full"
      />

      {/* Panel superior */}
      <div className="absolute top-4 left-4 right-4 z-20">
        <div className="bg-background/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{meta.emoji}</span>
              <span className="font-bold">{meta.label}</span>
            </div>
            <span className="font-bold text-primary text-lg">{formatPrice(service.finalPrice)}</span>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>📍 {service.originAddress}</p>
            {service.durationMinutes && (
              <p>⏱ {service.durationMinutes} minutos</p>
            )}
            <p>{service.paymentMethod === 'online' ? '💳 Online' : '💵 Efectivo'}</p>
          </div>

          {owner && (
            <div className="mt-3 p-2 bg-muted rounded-xl flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm">
                👤
              </div>
              <div>
                <p className="text-xs font-semibold">{owner.name} {owner.lastname}</p>
                <p className="text-xs text-muted-foreground">{owner.phone}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Panel inferior con acciones */}
      <div className="absolute bottom-4 left-4 right-4 z-20 space-y-2">
        {service.status === 'accepted' && (
          <Button className="w-full" onClick={handleOnWay} disabled={loading}>
            🚶 Estoy en camino
          </Button>
        )}
        {service.status === 'provider_on_way' && (
          <Button className="w-full" onClick={handleStart} disabled={loading}>
            ▶ Iniciar servicio
          </Button>
        )}
        {service.status === 'in_progress' && (
          <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleComplete} disabled={loading}>
            ✓ Completar servicio
          </Button>
        )}

        {(service.status === 'accepted' || service.status === 'provider_on_way') && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.replace('/dashboard')}
          >
            ← Volver al dashboard
          </Button>
        )}
      </div>
    </div>
  )
}
