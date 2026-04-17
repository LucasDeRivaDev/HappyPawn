'use client'

import { useAuthStore } from '@/store/auth'
import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function SuspendedPage() {
  const user = useAuthStore((s) => s.user)
  const reset = useAuthStore((s) => s.reset)
  const router = useRouter()

  async function handleLogout() {
    await signOut(auth)
    reset()
    router.replace('/')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="text-6xl">⛔</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Cuenta suspendida</h1>
          <p className="text-muted-foreground text-sm">
            Tu cuenta fue suspendida temporalmente por el equipo de PawGo.
          </p>
          {user?.suspensionReason && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 mt-3">
              <p className="text-sm text-destructive font-medium">Motivo:</p>
              <p className="text-sm text-destructive/80">{user.suspensionReason}</p>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Si creés que es un error, contactanos a{' '}
          <span className="font-medium">soporte@pawgo.com.ar</span>
        </p>
        <Button variant="outline" className="w-full" onClick={handleLogout}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}
