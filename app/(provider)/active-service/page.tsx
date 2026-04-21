'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MapViewDynamic } from '@/components/map/MapViewDynamic'
import { ServiceChat } from '@/components/services/ServiceChat'
import { NearbyRequestCard } from '@/components/services/NearbyRequestCard'
import { useAuthStore } from '@/store/auth'
import { useLocation } from '@/hooks/useLocation'
import { useProviderLocation } from '@/hooks/useProviderLocation'
import {
  subscribeToService,
  subscribeToNearbyRequests,
  updateServiceStatus,
  updateService,
  updateProvider,
  getProvider,
  getUser,
} from '@/lib/firestore'
import { formatPrice } from '@/lib/pricing'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { Service, User } from '@/types'
import { GeoPoint, serverTimestamp } from 'firebase/firestore'
import { AnimatePresence } from 'framer-motion'

const SERVICE_LABELS: Record<string, { emoji: string; label: string }> = {
  walk: { emoji: '🦮', label: 'Paseo' },
  vet_transfer: { emoji: '🏥', label: 'Traslado' },
  pet_transport: { emoji: '🚗', label: 'Transporte' },
}

// Formatea segundos como "14:32"
function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ProviderActiveServicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const serviceId = searchParams.get('serviceId')
  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)

  const [service, setService] = useState<Service | null>(null)
  const [owner, setOwner] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)

  // Cola: tiempo restante y próximo servicio
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const [nearbyRequests, setNearbyRequests] = useState<Service[]>([])
  const [nextServiceId, setNextServiceId] = useState<string | null>(null)
  const [acceptingNext, setAcceptingNext] = useState(false)

  const { userLocation } = useLocation(true)
  useProviderLocation(true)

  // Suscripción al servicio actual
  useEffect(() => {
    if (!authLoading && !user) { router.replace('/login'); return }
    if (!user) return
    if (!serviceId) { router.replace('/dashboard'); return }

    const unsub = subscribeToService(serviceId, (svc) => {
      setService(svc)
      if (svc?.status === 'completed' || svc?.status === 'cancelled') {
        if (nextServiceId) {
          router.replace(`/active-service?serviceId=${nextServiceId}`)
        } else {
          router.replace('/dashboard')
        }
      }
    })
    return unsub
  }, [user, authLoading, serviceId, router, nextServiceId])

  // Cargar datos del owner
  useEffect(() => {
    if (service?.ownerId) {
      getUser(service.ownerId).then(setOwner)
    }
  }, [service?.ownerId])

  // Timer de cuenta regresiva cuando el servicio está en progreso
  useEffect(() => {
    if (service?.status !== 'in_progress') {
      setRemainingSeconds(null)
      return
    }
    if (!service.startedAt || !service.durationMinutes) return

    const endMs = service.startedAt.toMillis() + service.durationMinutes * 60 * 1000

    const tick = () => {
      const diff = Math.max(0, Math.floor((endMs - Date.now()) / 1000))
      setRemainingSeconds(diff)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [service?.status, service?.startedAt, service?.durationMinutes])

  // Suscribir a solicitudes cercanas cuando quedan ≤15 min
  const showQueue =
    service?.status === 'in_progress' &&
    remainingSeconds !== null &&
    remainingSeconds <= 15 * 60 &&
    !nextServiceId

  useEffect(() => {
    if (!showQueue) {
      setNearbyRequests([])
      return
    }
    const unsub = subscribeToNearbyRequests((services) => {
      // Excluir el servicio actual
      setNearbyRequests(services.filter((s) => s.id !== serviceId))
    })
    return unsub
  }, [showQueue, serviceId])

  const handleAcceptNext = useCallback(async (nextSvc: Service) => {
    if (!user || !userLocation || acceptingNext) return
    setAcceptingNext(true)
    try {
      await updateServiceStatus(nextSvc.id, 'accepted', user.uid, 'Aceptado en cola')
      await updateService(nextSvc.id, { providerId: user.uid })
      setNextServiceId(nextSvc.id)
      toast.success('Próximo trabajo reservado — terminá el actual y andás directo')

      // Notificar al owner del próximo servicio
      fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUid: nextSvc.ownerId,
          title: '🐾 ¡Tu solicitud fue aceptada!',
          body: 'El proveedor terminará otro servicio primero y luego va a tu ubicación.',
          data: { serviceId: nextSvc.id },
        }),
      }).catch(() => {})
    } catch {
      toast.error('Error al aceptar el próximo trabajo')
    } finally {
      setAcceptingNext(false)
    }
  }, [user, userLocation, acceptingNext])

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
        startedAt: serverTimestamp() as any,
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
      await updateService(serviceId, { finishedAt: serverTimestamp() as any })

      if (service?.paymentMethod === 'cash') {
        const provider = await getProvider(user.uid)
        const commissionDebt = service.commissionAmount
        await updateProvider(user.uid, {
          pendingCommissionDebt: (provider?.pendingCommissionDebt ?? 0) + commissionDebt,
          totalEarnings: (provider?.totalEarnings ?? 0) + service.finalPrice - commissionDebt,
        })
      }

      toast.success('¡Servicio completado! 🎉')
      // La redirección la maneja el onSnapshot (al detectar status=completed)
    } catch {
      toast.error('Error al completar el servicio')
    } finally {
      setLoading(false)
    }
  }

  async function handleAccept() {
    if (!serviceId || !user || !userLocation) return
    setLoading(true)
    try {
      await updateServiceStatus(serviceId, 'accepted', user.uid, 'Aceptado por proveedor')
      await updateService(serviceId, { providerId: user.uid })
      toast.success('Servicio aceptado — andá al punto de encuentro')

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
        }).catch(() => {})
      }
    } catch {
      toast.error('Error al aceptar el servicio')
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

          {/* Cuenta regresiva */}
          {service.status === 'in_progress' && remainingSeconds !== null && (
            <div className={`mt-3 rounded-xl px-3 py-2 flex items-center justify-between ${
              remainingSeconds <= 15 * 60
                ? 'bg-orange-100 dark:bg-orange-900/30'
                : 'bg-muted'
            }`}>
              <span className="text-xs font-medium">
                {remainingSeconds <= 15 * 60 ? '⚡ Tiempo restante' : '⏱ Tiempo restante'}
              </span>
              <span className={`font-bold text-sm tabular-nums ${
                remainingSeconds <= 5 * 60
                  ? 'text-destructive'
                  : remainingSeconds <= 15 * 60
                  ? 'text-orange-600'
                  : 'text-foreground'
              }`}>
                {formatCountdown(remainingSeconds)}
              </span>
            </div>
          )}

          {/* Próximo servicio reservado */}
          {nextServiceId && (
            <div className="mt-2 bg-green-100 dark:bg-green-900/30 rounded-xl px-3 py-2">
              <p className="text-xs font-medium text-green-700 dark:text-green-400">
                ✅ Próximo trabajo reservado — te redirige al terminar
              </p>
            </div>
          )}

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

      {/* Cola de próximo trabajo (≤15 min restantes) */}
      {showQueue && nearbyRequests.length > 0 && (
        <div className="absolute top-1/2 left-4 right-4 z-20 -translate-y-1/2">
          <div className="bg-background/95 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-orange-300">
            <p className="text-xs font-bold text-orange-600 mb-2 uppercase tracking-wide">
              ⚡ Trabajos disponibles cerca
            </p>
            <AnimatePresence>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {nearbyRequests.slice(0, 3).map((req) => (
                  <NearbyRequestCard
                    key={req.id}
                    service={req}
                    onAccept={() => handleAcceptNext(req)}
                  />
                ))}
              </div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {showQueue && nearbyRequests.length === 0 && (
        <div className="absolute top-1/2 left-4 right-4 z-20 -translate-y-1/2">
          <div className="bg-background/90 backdrop-blur-sm rounded-2xl p-4 border border-border text-center">
            <p className="text-sm text-muted-foreground">
              ⏳ Sin solicitudes disponibles cerca por ahora
            </p>
          </div>
        </div>
      )}

      {/* Panel inferior con acciones */}
      <div className="absolute bottom-4 left-4 right-4 z-20 space-y-2">
        {['accepted', 'provider_on_way', 'in_progress'].includes(service.status) && (
          <ServiceChat
            serviceId={serviceId!}
            otherUserName={owner ? owner.name : 'el cliente'}
          />
        )}
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
