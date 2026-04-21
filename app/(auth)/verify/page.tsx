'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'

export default function VerifyPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    // Si ya fue aprobado, redirigir
    if (user?.verificationStatus === 'approved') {
      switch (user.role) {
        case 'admin':
          router.replace('/admin')
          break
        case 'walker':
        case 'driver':
          router.replace('/dashboard')
          break
        default:
          router.replace('/home')
      }
    }
  }, [user, router])

  async function handleLogout() {
    await signOut(auth)
    router.replace('/login')
  }

  const status = user?.verificationStatus

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        {status === 'rejected' ? (
          <>
            <div className="text-5xl">❌</div>
            <h1 className="text-xl font-bold">Verificación rechazada</h1>
            <p className="text-muted-foreground text-sm">
              Tus documentos fueron revisados y no pudieron ser verificados.
            </p>
            {/* Nota del admin si existe */}
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm text-left">
              <p className="font-medium text-destructive mb-1">Motivo:</p>
              <p className="text-muted-foreground">
                Revisá que las fotos del DNI sean claras y que la selfie muestre tu cara
                completa con buena iluminación. Luego volvé a intentarlo.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => router.push('/register/step-2')}
            >
              Volver a subir documentos
            </Button>
          </>
        ) : (
          <>
            <div className="text-5xl animate-pulse">🕐</div>
            <h1 className="text-xl font-bold">Verificando tu identidad</h1>
            <p className="text-muted-foreground text-sm">
              Recibimos tus documentos. Nuestro equipo los está revisando. Te vamos a
              notificar cuando estés listo para usar PawGo.
            </p>

            <div className="bg-muted rounded-xl p-4 text-sm text-left space-y-2">
              <p className="font-medium">¿Qué pasa ahora?</p>
              <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                <li>Revisamos tu DNI y selfie (generalmente en menos de 24hs)</li>
                <li>Recibís una notificación cuando sea aprobado</li>
                <li>Mientras tanto podés explorar la app</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>Estado actual:</p>
              <div className="inline-flex items-center justify-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full px-4 py-1.5 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                Pendiente de revisión
              </div>
            </div>
          </>
        )}

        <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleLogout}>
          Cerrar sesión
        </Button>
      </div>
    </main>
  )
}
