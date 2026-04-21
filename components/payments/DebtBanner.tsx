'use client'

import { useDebt } from '@/hooks/useDebt'
import { formatPrice } from '@/lib/pricing'

export function DebtBanner() {
  const { debt, hasDebt } = useDebt()
  if (!hasDebt) return null

  return (
    <div className="absolute top-20 left-4 right-4 z-20">
      <div className="bg-orange-500/95 backdrop-blur-sm text-white rounded-2xl px-4 py-2.5 shadow-lg text-sm flex items-center gap-2">
        <span>⚠️</span>
        <span>
          Tenés <strong>{formatPrice(debt)}</strong> de deuda por servicios en efectivo.
          Se descuenta del próximo cobro online.
        </span>
      </div>
    </div>
  )
}
