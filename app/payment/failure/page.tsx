'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function PaymentFailurePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const serviceId = searchParams.get('serviceId')

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="text-7xl">❌</div>
        <h1 className="text-2xl font-bold">Pago fallido</h1>
        <p className="text-muted-foreground">
          No pudimos procesar tu pago. Revisá los datos de tu tarjeta y volvé a intentar.
        </p>

        <div className="flex flex-col gap-2 pt-4">
          {serviceId ? (
            <Button onClick={() => router.push(`/tracking?serviceId=${serviceId}`)}>
              Intentar de nuevo
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => router.push('/home')}>
            Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  )
}
