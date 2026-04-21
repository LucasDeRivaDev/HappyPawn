'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getTransactionsByProvider } from '@/lib/firestore'
import { formatPrice } from '@/lib/pricing'
import { BottomNav } from '@/components/layout/BottomNav'
import type { Transaction } from '@/types'

const SERVICE_META: Record<string, { emoji: string; label: string }> = {
  walk: { emoji: '🦮', label: 'Paseo' },
  vet_transfer: { emoji: '🏥', label: 'Veterinaria' },
  pet_transport: { emoji: '🚗', label: 'Transporte' },
}

export default function ProviderEarningsPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const provider = useAuthStore((s) => s.provider)
  const authLoading = useAuthStore((s) => s.loading)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) { router.replace('/login'); return }
    if (!user) return
    getTransactionsByProvider(user.uid).then((data) => {
      setTransactions(data)
      setLoading(false)
    })
  }, [user, authLoading, router])

  const totalEarnings = transactions.reduce((sum, t) => sum + t.finalPrice - t.commissionAmount, 0)
  const totalCommission = transactions.reduce((sum, t) => sum + t.commissionAmount, 0)
  const pendingDebt = provider?.pendingCommissionDebt ?? 0

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <h1 className="font-bold text-lg">Mis ganancias</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Resumen */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
            <p className="text-xs text-green-700 font-medium uppercase tracking-wide">
              Total ganado
            </p>
            <p className="text-2xl font-bold text-green-700 mt-1">
              {formatPrice(totalEarnings)}
            </p>
          </div>
          <div className={`rounded-2xl p-4 border ${pendingDebt > 0 ? 'bg-orange-50 border-orange-100' : 'bg-muted border-border'}`}>
            <p className={`text-xs font-medium uppercase tracking-wide ${pendingDebt > 0 ? 'text-orange-700' : 'text-muted-foreground'}`}>
              Deuda comisión
            </p>
            <p className={`text-2xl font-bold mt-1 ${pendingDebt > 0 ? 'text-orange-700' : 'text-foreground'}`}>
              {formatPrice(pendingDebt)}
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-4 border border-border">
          <p className="text-xs text-muted-foreground">
            La comisión de PawGo (5%) se descuenta automáticamente de tus pagos online.
            Si pagaron en efectivo, tenés una deuda que se cancela en el próximo pago online.
          </p>
        </div>

        {/* Lista de transacciones */}
        <div>
          <p className="font-semibold mb-3">Historial</p>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-4xl mb-2">💰</p>
              <p>Todavía no tenés transacciones</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((t) => {
                const meta = SERVICE_META[t.serviceType] ?? SERVICE_META.walk
                const net = t.finalPrice - t.commissionAmount
                const date = t.createdAt
                  ? new Date((t.createdAt as any).toDate()).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: 'short',
                    })
                  : ''

                return (
                  <div
                    key={t.id}
                    className="bg-card rounded-2xl p-4 border border-border"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{meta.emoji}</span>
                        <div>
                          <p className="font-semibold text-sm">{meta.label}</p>
                          <p className="text-xs text-muted-foreground">{date}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.paymentMethod === 'online' ? '💳 Online' : '💵 Efectivo'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">+{formatPrice(net)}</p>
                        <p className="text-xs text-muted-foreground">
                          -{formatPrice(t.commissionAmount)} com.
                        </p>
                        {t.debtCancelledAmount > 0 && (
                          <p className="text-xs text-orange-600">
                            -{formatPrice(t.debtCancelledAmount)} deuda
                          </p>
                        )}
                      </div>
                    </div>

                    {t.durationMinutes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ⏱ {t.durationMinutes} min
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNav active="earnings" />
    </div>
  )
}
