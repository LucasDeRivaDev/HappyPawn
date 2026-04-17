'use client'

import { motion } from 'framer-motion'
import type { Provider } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@/store/auth'

interface ProviderBottomSheetProps {
  provider: Provider
  onClose: () => void
  onRequest: () => void
}

const SERVICE_LABELS: Record<string, string> = {
  walk: '🦮 Paseos',
  vet_transfer: '🏥 Traslado vet',
  pet_transport: '🚗 Transporte',
}

export function ProviderBottomSheet({
  provider,
  onClose,
  onRequest,
}: ProviderBottomSheetProps) {
  const providerUser = useAuthStore((s) => s.user) // Acá iría el user del provider, simplificado

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 z-30 bg-black/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-40 bg-background rounded-t-3xl shadow-2xl border-t border-border p-6 pb-10 space-y-4"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto -mt-2 mb-4" />

        {/* Header del proveedor */}
        <div className="flex items-center gap-4">
          <Avatar className="w-14 h-14 border-2 border-primary">
            <AvatarImage src={undefined} />
            <AvatarFallback className="bg-primary text-white text-xl">🦮</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <p className="font-bold text-lg">Paseador disponible</p>
            <div className="flex items-center gap-1">
              <span className="text-yellow-500">★</span>
              <span className="text-sm font-medium">
                {provider.uid ? '4.9' : '—'}
              </span>
              <span className="text-xs text-muted-foreground ml-1">· Disponible ahora</span>
            </div>
          </div>

          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
        </div>

        {/* Bio */}
        {provider.bio ? (
          <p className="text-sm text-muted-foreground">{provider.bio}</p>
        ) : null}

        {/* Servicios */}
        <div className="flex flex-wrap gap-2">
          {provider.services?.map((s) => (
            <Badge key={s} variant="secondary" className="text-xs">
              {SERVICE_LABELS[s] ?? s}
            </Badge>
          ))}
        </div>

        {/* CTA */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cerrar
          </Button>
          <Button className="flex-1" onClick={onRequest}>
            Solicitar servicio
          </Button>
        </div>
      </motion.div>
    </>
  )
}
