'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const serviceId = searchParams.get('serviceId')

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="text-7xl">🎉</div>
        <h1 className="text-2xl font-bold">¡Pago exitoso!</h1>
        <p className="text-muted-foreground">
          Tu pago fue procesado correctamente. ¡Gracias por usar PawGo!
        </p>

        <div className="flex flex-col gap-2 pt-4">
          {serviceId ? (
            <Button onClick={() => router.push(`/tracking?serviceId=${serviceId}`)}>
              Ver seguimiento del servicio
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => router.push('/home')}>
            Volver al inicio
          </Button>
          <Button variant="ghost" onClick={() => router.push('/history')}>
            Ver historial
          </Button>
        </div>
      </div>
    </div>
  )
}
