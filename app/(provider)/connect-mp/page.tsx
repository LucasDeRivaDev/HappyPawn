'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'

export default function ConnectMPPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!user) router.replace('/login')
  }, [user, router])

  function handleConnect() {
    if (!user) return

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const clientId = process.env.NEXT_PUBLIC_MP_CLIENT_ID

    if (!clientId) {
      alert('Configuración de MercadoPago no disponible. Contactá al administrador.')
      return
    }

    const redirectUri = encodeURIComponent(`${siteUrl}/api/mp/callback`)
    // state = uid del provider para identificarlo en el callback
    const state = encodeURIComponent(user.uid)

    const mpAuthUrl =
      `https://auth.mercadopago.com.ar/authorization` +
      `?client_id=${clientId}` +
      `&response_type=code` +
      `&platform_id=mp` +
      `&state=${state}` +
      `&redirect_uri=${redirectUri}`

    window.location.href = mpAuthUrl
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="text-6xl">💳</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Conectá tu cuenta de MercadoPago</h1>
          <p className="text-muted-foreground text-sm">
            Para recibir pagos online de tus clientes necesitás vincular
            tu cuenta de MercadoPago. PawGo descuenta automáticamente
            la comisión del 5% en cada cobro.
          </p>
        </div>

        <div className="bg-muted rounded-2xl p-4 text-left space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-lg">✅</span>
            <p>Recibís el <strong>95%</strong> de cada servicio directo en tu cuenta</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">✅</span>
            <p>PawGo descuenta su <strong>5%</strong> automáticamente, sin transferencias manuales</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">✅</span>
            <p>Podés cobrar con tarjeta, débito, QR o dinero en cuenta</p>
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={handleConnect}>
          Conectar con MercadoPago
        </Button>

        <button
          onClick={() => router.back()}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Ahora no
        </button>
      </div>
    </div>
  )
}
