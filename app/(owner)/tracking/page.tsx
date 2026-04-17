'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MapViewDynamic } from '@/components/map/MapViewDynamic'
import { ServiceChat } from '@/components/services/ServiceChat'
import { useAuthStore } from '@/store/auth'
import { useServiceStore } from '@/store/service'
import { subscribeToService, updateServiceStatus, createRating } from '@/lib/firestore'
import { subscribeToProvider } from '@/lib/firestore'
import { useLocation } from '@/hooks/useLocation'
import { formatPrice } from '@/lib/pricing'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { Service, Provider } from '@/types'

const STATUS_STEPS = [
  { key: 'requested', label: 'Buscando proveedor', emoji: '🔍' },
  { key: 'accepted', label: 'Proveedor aceptó', emoji: '✅' },
  { key: 'provider_on_way', label: 'Proveedor en camino', emoji: '🚶' },
  { key: 'in_progress', label: 'En progreso', emoji: '🦮' },
  { key: 'completed', label: 'Completado', emoji: '🎉' },
]

export default function TrackingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const serviceId = searchParams.get('serviceId')
  const user = useAuthStore((s) => s.user)

  const [service, setService] = useState<Service | null>(null)
  const [provider, setProvider] = useState<Provider | null>(null)
  const [showRating, setShowRating] = useState(false)
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  const [redirectingToMP, setRedirectingToMP] = useState(false)

  const { userLocation } = useLocation(false)

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (!serviceId) { router.replace('/home'); return }

    const unsub = subscribeToService(serviceId, (svc) => {
      setService(svc)
      if (svc?.status === 'completed' && !showRating) {
        if (svc.paymentMethod === 'online' && svc.paymentStatus !== 'paid') {
          // Crear preferencia y redirigir a MP
          handleOnlinePayment(svc.id)
        } else {
          setShowRating(true)
        }
      }
    })
    return unsub
  }, [user, serviceId, router])

  useEffect(() => {
    if (!service?.providerId) return
    const unsub = subscribeToProvider(service.providerId, setProvider)
    return unsub
  }, [service?.providerId])

  const currentStep = STATUS_STEPS.findIndex((s) => s.key === service?.status)

  async function handleOnlinePayment(svcId: string) {
    if (redirectingToMP) return
    setRedirectingToMP(true)
    try {
      const res = await fetch('/api/payment/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId: svcId }),
      })
      const data = await res.json()
      if (data.initPoint) {
        window.location.href = data.initPoint
      } else {
        toast.error(data.error ?? 'Error al crear el pago')
        setRedirectingToMP(false)
        setShowRating(true)
      }
    } catch {
      toast.error('Error de conexión al crear el pago')
      setRedirectingToMP(false)
      setShowRating(true)
    }
  }

  async function handleCancelRequest() {
    if (!serviceId || !user) return
    try {
      await updateServiceStatus(serviceId, 'cancelled', user.uid, 'Cancelado por el dueño')
      toast.success('Solicitud cancelada')
      router.replace('/home')
    } catch {
      toast.error('Error al cancelar')
    }
  }

  async function handleSubmitRating() {
    if (!service || !user || !service.providerId) return
    setSubmittingRating(true)
    try {
      const { createRating: createR } = await import('@/lib/firestore')
      await createR({
        serviceId: service.id,
        fromUserId: user.uid,
        toUserId: service.providerId,
        score: rating,
        comment: review || undefined,
        createdAt: null as any,
      })
      toast.success('¡Gracias por tu calificación!')
      router.replace('/home')
    } catch {
      toast.error('Error al enviar calificación')
    } finally {
      setSubmittingRating(false)
    }
  }

  if (!service || redirectingToMP) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-4xl animate-spin">🐾</div>
          <p className="text-muted-foreground">
            {redirectingToMP ? 'Preparando el pago...' : 'Cargando servicio...'}
          </p>
        </div>
      </div>
    )
  }

  const providerLocation = provider?.currentLocation
    ? { lat: provider.currentLocation.latitude, lng: provider.currentLocation.longitude }
    : null

  // Modal de calificación post-servicio
  if (showRating && service.status === 'completed') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold">¡Servicio completado!</h2>
            <p className="text-muted-foreground">
              Total pagado: <span className="font-bold text-foreground">{formatPrice(service.finalPrice)}</span>
            </p>
          </div>

          <div className="bg-card rounded-2xl p-4 border border-border space-y-4">
            <p className="font-semibold text-center">¿Cómo fue el servicio?</p>

            {/* Estrellas */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-3xl transition-transform ${
                    star <= rating ? 'scale-110' : 'opacity-30'
                  }`}
                >
                  ⭐
                </button>
              ))}
            </div>

            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Dejá un comentario (opcional)"
              className="w-full bg-muted rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
            />
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmitRating}
            disabled={submittingRating}
          >
            {submittingRating ? 'Enviando...' : 'Calificar y terminar'}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.replace('/home')}
          >
            Saltar calificación
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Mapa */}
      <MapViewDynamic
        userLocation={userLocation}
        providers={provider && providerLocation ? [{
          ...provider,
          currentLocation: provider.currentLocation,
        }] : []}
        className="h-full w-full"
      />

      {/* Panel superior */}
      <div className="absolute top-4 left-4 right-4 z-20">
        <div className="bg-background/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-border">
          {/* Steps */}
          <div className="flex items-center justify-between mb-3">
            {STATUS_STEPS.slice(0, 4).map((step, i) => (
              <div key={step.key} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                    i <= currentStep
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i < currentStep ? '✓' : step.emoji}
                </div>
                {i < 3 && (
                  <div
                    className={`h-0.5 w-6 mx-0.5 transition-all ${
                      i < currentStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <p className="font-bold text-center">
            {STATUS_STEPS[currentStep]?.label ?? 'Actualizando...'}
          </p>

          {provider && (
            <div className="mt-3 flex items-center gap-3 p-2 bg-muted rounded-xl">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                {service.serviceType === 'walk' ? '🦮' : '🚗'}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Proveedor asignado</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      className={`text-xs ${s <= Math.round(0) ? 'text-yellow-500' : 'text-muted-foreground'}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <p className="font-bold text-primary">{formatPrice(service.finalPrice)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Panel inferior */}
      <div className="absolute bottom-4 left-4 right-4 z-20 space-y-2">
        {/* Chat — disponible cuando hay proveedor asignado */}
        {service.providerId && (
          ['accepted', 'provider_on_way', 'in_progress'].includes(service.status) && (
            <ServiceChat
              serviceId={service.id}
              otherUserName="el paseador"
            />
          )
        )}

        {service.status === 'requested' && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCancelRequest}
          >
            Cancelar solicitud
          </Button>
        )}
        {service.status === 'in_progress' && (
          <div className="bg-background/95 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-border text-center">
            <p className="text-sm font-medium">🦮 Paseo en progreso</p>
            <p className="text-xs text-muted-foreground">
              Tu mascota está siendo paseada
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
