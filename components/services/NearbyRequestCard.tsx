'use client'

import { motion } from 'framer-motion'
import type { Service } from '@/types'
import { formatPrice } from '@/lib/pricing'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const SERVICE_LABELS: Record<string, string> = {
  walk: '🦮 Paseo',
  vet_transfer: '🏥 Traslado veterinaria',
  pet_transport: '🚗 Transporte',
}

const DURATION_LABELS: Record<number, string> = {
  30: '30 min',
  45: '45 min',
  60: '60 min',
}

export function NearbyRequestCard({
  service,
  onAccept,
}: {
  service: Service
  onAccept: () => void
}) {
  return (
    <motion.div
      className="bg-background/95 backdrop-blur-sm rounded-2xl border border-border shadow-lg p-4 space-y-3"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">
            {SERVICE_LABELS[service.serviceType] ?? service.serviceType}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            📍 {service.originAddress}
          </p>
        </div>

        {/* Método de pago — visible antes de aceptar */}
        <Badge
          variant={service.paymentMethod === 'online' ? 'default' : 'secondary'}
          className="text-xs shrink-0"
        >
          {service.paymentMethod === 'online' ? '💳 Online' : '💵 Efectivo'}
        </Badge>
      </div>

      <div className="flex items-center gap-3 text-sm">
        {service.durationMinutes && (
          <span className="text-muted-foreground">
            ⏱ {DURATION_LABELS[service.durationMinutes] ?? `${service.durationMinutes} min`}
          </span>
        )}
        <span className="font-bold text-primary ml-auto">
          {formatPrice(service.basePrice)}
        </span>
      </div>

      <Button size="sm" className="w-full" onClick={onAccept}>
        Aceptar trabajo
      </Button>
    </motion.div>
  )
}
