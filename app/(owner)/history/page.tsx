'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { queryCollection } from '@/lib/firestore'
import { formatPrice } from '@/lib/pricing'
import { BottomNav } from '@/components/layout/BottomNav'
import { Badge } from '@/components/ui/badge'
import { where, orderBy, limit } from 'firebase/firestore'
import type { Service } from '@/types'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  completed: { label: 'Completado', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
  requested: { label: 'Solicitado', color: 'bg-yellow-100 text-yellow-700' },
  in_progress: { label: 'En progreso', color: 'bg-blue-100 text-blue-700' },
}

const SERVICE_META: Record<string, { emoji: string; label: string }> = {
  walk: { emoji: '🦮', label: 'Paseo' },
  vet_transfer: { emoji: '🏥', label: 'Veterinaria' },
  pet_transport: { emoji: '🚗', label: 'Transporte' },
}

export default function HistoryPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) { router.replace('/login'); return }
    if (!user) return

    queryCollection<Service>('services', [
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50),
    ]).then((data) => {
      setServices(data)
      setLoading(false)
    })
  }, [user, authLoading, router])

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <h1 className="font-bold text-lg">Historial</h1>
      </div>

      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-5xl mb-3">📋</div>
            <p className="font-medium">Todavía no hiciste ningún servicio</p>
            <p className="text-sm mt-1">Solicitá un paseo desde el mapa</p>
          </div>
        ) : (
          services.map((svc) => {
            const meta = SERVICE_META[svc.serviceType] ?? SERVICE_META.walk
            const statusInfo = STATUS_LABEL[svc.status] ?? STATUS_LABEL.requested
            const date = svc.createdAt
              ? new Date((svc.createdAt as any).toDate()).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : ''

            return (
              <div
                key={svc.id}
                className="bg-card rounded-2xl p-4 border border-border space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{meta.emoji}</span>
                    <div>
                      <p className="font-semibold">{meta.label}</p>
                      <p className="text-xs text-muted-foreground">{date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{formatPrice(svc.finalPrice)}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  📍 {svc.originAddress || 'Sin dirección'}
                </p>

                {svc.durationMinutes && (
                  <p className="text-xs text-muted-foreground">⏱ {svc.durationMinutes} min</p>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{svc.paymentMethod === 'online' ? '💳 Online' : '💵 Efectivo'}</span>
                  {svc.rating && (
                    <span>{'⭐'.repeat(svc.rating)} ({svc.rating}/5)</span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <BottomNav active="history" />
    </div>
  )
}
