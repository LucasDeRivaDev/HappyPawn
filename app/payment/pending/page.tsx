'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function PaymentPendingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="text-7xl">⏳</div>
        <h1 className="text-2xl font-bold">Pago en proceso</h1>
        <p className="text-muted-foreground">
          Tu pago está siendo procesado. Podés cerrar esta pantalla, te avisaremos cuando esté
          confirmado.
        </p>

        <div className="flex flex-col gap-2 pt-4">
          <Button onClick={() => router.push('/home')}>
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
