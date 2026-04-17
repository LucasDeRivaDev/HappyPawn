'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { useServiceStore } from '@/store/service'
import { getPetsByOwner, createService, getPricingConfig, getProvider } from '@/lib/firestore'
import { calculateWalkPrice, calculateVetTransferPrice, calculatePetTransportPrice, formatPrice, DEFAULT_PRICING_CONFIG } from '@/lib/pricing'
import { useLocation } from '@/hooks/useLocation'
import { reverseGeocode } from '@/lib/geolocation'
import { GeoPoint } from 'firebase/firestore'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { Pet, ServiceType, PaymentMethod, PricingConfig } from '@/types'

const SERVICE_META = {
  walk: { emoji: '🦮', label: 'Paseo', color: 'bg-green-500' },
  vet_transfer: { emoji: '🏥', label: 'Traslado al veterinario', color: 'bg-blue-500' },
  pet_transport: { emoji: '🚗', label: 'Transporte pet-friendly', color: 'bg-purple-500' },
}

export default function RequestServicePage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const serviceType = params.type as ServiceType
  const providerId = searchParams.get('providerId')
  const user = useAuthStore((s) => s.user)
  const setActiveService = useServiceStore((s) => s.setActiveService)

  const [pets, setPets] = useState<Pet[]>([])
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([])
  const [duration, setDuration] = useState<30 | 45 | 60>(30)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('online')
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(DEFAULT_PRICING_CONFIG)
  const [providerAdjust, setProviderAdjust] = useState(0)
  const [loading, setLoading] = useState(false)
  const [address, setAddress] = useState('')

  const { userLocation } = useLocation(true)

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    getPetsByOwner(user.uid).then(setPets)
    getPricingConfig().then((c) => { if (c) setPricingConfig(c) })
    if (providerId) {
      getProvider(providerId).then((p) => {
        if (p) setProviderAdjust(p.providerAdjustPercent ?? 0)
      })
    }
  }, [user, router, providerId])

  useEffect(() => {
    if (userLocation) {
      reverseGeocode(userLocation).then((addr) => {
        if (addr) setAddress(addr)
      }).catch(() => {})
    }
  }, [userLocation])

  function togglePet(petId: string) {
    setSelectedPetIds((prev) =>
      prev.includes(petId) ? prev.filter((id) => id !== petId) : [...prev, petId]
    )
  }

  function getPrice(): number {
    if (serviceType === 'walk') return calculateWalkPrice(duration, pricingConfig, providerAdjust)
    if (serviceType === 'vet_transfer') return calculateVetTransferPrice(5, 0, false, pricingConfig)
    return calculatePetTransportPrice(5, pricingConfig)
  }

  async function handleRequest() {
    if (!user || !userLocation) {
      toast.error('Necesitamos tu ubicación para continuar.')
      return
    }
    if (selectedPetIds.length === 0) {
      toast.error('Seleccioná al menos una mascota.')
      return
    }
    setLoading(true)
    try {
      const price = getPrice()
      const serviceId = await createService({
        serviceType,
        status: 'requested',
        ownerId: user.uid,
        petIds: selectedPetIds,
        paymentMethod,
        paymentStatus: 'pending',
        durationMinutes: serviceType === 'walk' ? duration : undefined,
        basePrice: price,
        finalPrice: price,
        commissionPercent: 5,
        commissionAmount: price * 0.05,
        debtCancelledAmount: 0,
        mpSplitExecuted: false,
        route: [],
        originAddress: address,
        originCoords: new GeoPoint(userLocation.lat, userLocation.lng),
        requestedAt: null as any,
        createdAt: null as any,
      })

      toast.success('Solicitud enviada — buscando proveedor...')
      router.push(`/tracking?serviceId=${serviceId}`)
    } catch (err) {
      console.error(err)
      toast.error('Error al crear la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  const meta = SERVICE_META[serviceType] ?? SERVICE_META.walk

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
          ←
        </button>
        <span className="text-xl">{meta.emoji}</span>
        <h1 className="font-bold text-lg">{meta.label}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Ubicación */}
        <section>
          <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
            Tu ubicación
          </Label>
          <div className="bg-muted rounded-xl p-3 text-sm">
            {address || (userLocation ? 'Obteniendo dirección...' : 'Activando GPS...')}
          </div>
        </section>

        {/* Mascotas */}
        <section>
          <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
            ¿Con qué mascotas?
          </Label>
          {pets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p className="text-2xl mb-2">🐾</p>
              <p>No tenés mascotas registradas</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => router.push('/pets')}
              >
                Agregar mascota
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {pets.map((pet) => {
                const selected = selectedPetIds.includes(pet.id)
                return (
                  <button
                    key={pet.id}
                    onClick={() => togglePet(pet.id)}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${
                      selected
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="text-2xl mb-1">🐕</div>
                    <p className="font-semibold text-sm">{pet.name}</p>
                    <p className="text-xs text-muted-foreground">{pet.breed}</p>
                    <p className="text-xs text-muted-foreground capitalize">{pet.size}</p>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Duración (solo para paseos) */}
        {serviceType === 'walk' && (
          <section>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
              Duración del paseo
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {([30, 45, 60] as const).map((min) => (
                <button
                  key={min}
                  onClick={() => setDuration(min)}
                  className={`rounded-xl border-2 p-3 text-center transition-all ${
                    duration === min
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card'
                  }`}
                >
                  <p className="font-bold text-lg">{min}</p>
                  <p className="text-xs text-muted-foreground">min</p>
                  <p className="text-xs font-medium text-primary mt-1">
                    {formatPrice(calculateWalkPrice(min, pricingConfig))}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Método de pago */}
        <section>
          <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
            Método de pago
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPaymentMethod('online')}
              className={`rounded-xl border-2 p-3 text-center transition-all ${
                paymentMethod === 'online'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              }`}
            >
              <p className="text-xl mb-1">💳</p>
              <p className="font-semibold text-sm">Online</p>
              <p className="text-xs text-muted-foreground">MercadoPago</p>
            </button>
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`rounded-xl border-2 p-3 text-center transition-all ${
                paymentMethod === 'cash'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              }`}
            >
              <p className="text-xl mb-1">💵</p>
              <p className="font-semibold text-sm">Efectivo</p>
              <p className="text-xs text-muted-foreground">Al terminar</p>
            </button>
          </div>
        </section>
      </div>

      {/* Footer fijo con precio y botón */}
      <div className="sticky bottom-0 bg-background border-t border-border px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-muted-foreground text-sm">Precio estimado</span>
            {providerAdjust !== 0 && (
              <span className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                providerAdjust > 0
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-green-100 text-green-600'
              }`}>
                {providerAdjust > 0 ? `+${providerAdjust}%` : `${providerAdjust}%`}
              </span>
            )}
          </div>
          <span className="text-2xl font-bold text-primary">{formatPrice(getPrice())}</span>
        </div>
        <Button
          className="w-full"
          size="lg"
          onClick={handleRequest}
          disabled={loading || selectedPetIds.length === 0 || !userLocation}
        >
          {loading ? 'Enviando solicitud...' : `Solicitar ${meta.label}`}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Solo se cobra cuando el servicio esté confirmado
        </p>
      </div>
    </div>
  )
}
