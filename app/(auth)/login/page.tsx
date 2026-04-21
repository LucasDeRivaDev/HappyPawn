'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getUser } from '@/lib/firestore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showDni, setShowDni] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const cred = await signInWithEmailAndPassword(auth, data.email, data.password)
      const user = await getUser(cred.user.uid)
      redirectByRole(user?.role)
    } catch {
      toast.error('Email o contraseña incorrectos.')
    } finally {
      setLoading(false)
    }
  }

  async function loginWithGoogle() {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const cred = await signInWithPopup(auth, provider)
      const user = await getUser(cred.user.uid)
      if (!user) {
        // Usuario nuevo — mandar a registro
        router.push('/register/step-1')
        return
      }
      redirectByRole(user.role)
    } catch {
      toast.error('Error al iniciar sesión con Google.')
    } finally {
      setLoading(false)
    }
  }

  function redirectByRole(role?: string) {
    switch (role) {
      case 'admin':
        router.push('/admin')
        break
      case 'walker':
      case 'driver':
        router.push('/dashboard')
        break
      default:
        router.push('/home')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-4xl">🐾</div>
          <h1 className="text-2xl font-bold">Bienvenido a PawGo</h1>
          <p className="text-muted-foreground text-sm">Iniciá sesión para continuar</p>
        </div>

        {!showDni ? (
          <>
            {/* Email + password */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vos@ejemplo.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-destructive text-xs">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-destructive text-xs">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Entrando...' : 'Iniciar sesión'}
              </Button>
            </form>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-muted-foreground text-xs">o</span>
              <Separator className="flex-1" />
            </div>

            {/* Google */}
            <Button
              variant="outline"
              className="w-full"
              onClick={loginWithGoogle}
              disabled={loading}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuar con Google
            </Button>

            {/* DNI */}
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => setShowDni(true)}
            >
              Entrar con DNI
            </Button>
          </>
        ) : (
          <DniLoginForm onBack={() => setShowDni(false)} onSuccess={redirectByRole} />
        )}

        <p className="text-center text-sm text-muted-foreground">
          ¿No tenés cuenta?{' '}
          <Link href="/register/step-1" className="text-primary font-medium">
            Crear cuenta
          </Link>
        </p>
      </div>
    </main>
  )
}

// ─── DNI Login ────────────────────────────────────────────────────────────────

const dniSchema = z.object({
  dni: z
    .string()
    .regex(/^\d{7,8}$/, 'El DNI debe tener 7 u 8 dígitos, sin puntos'),
  birthDate: z.string().min(1, 'Ingresá tu fecha de nacimiento'),
})
type DniFormData = z.infer<typeof dniSchema>

function DniLoginForm({
  onBack,
  onSuccess,
}: {
  onBack: () => void
  onSuccess: (role?: string) => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DniFormData>({ resolver: zodResolver(dniSchema) })

  async function onSubmit(data: DniFormData) {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/dni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni: data.dni, birthDate: data.birthDate }),
      })

      if (!res.ok) {
        toast.error('DNI o fecha de nacimiento incorrectos.')
        return
      }

      const { customToken, role } = await res.json()
      const { signInWithCustomToken } = await import('firebase/auth')
      await signInWithCustomToken(auth, customToken)
      onSuccess(role)
    } catch {
      toast.error('Error al verificar el DNI.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="dni">DNI</Label>
        <Input
          id="dni"
          placeholder="Sin puntos (ej: 38000000)"
          inputMode="numeric"
          {...register('dni')}
        />
        {errors.dni && <p className="text-destructive text-xs">{errors.dni.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="birthDate">Fecha de nacimiento</Label>
        <Input id="birthDate" type="date" {...register('birthDate')} />
        {errors.birthDate && (
          <p className="text-destructive text-xs">{errors.birthDate.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Verificando...' : 'Ingresar con DNI'}
      </Button>

      <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
        ← Volver
      </Button>
    </form>
  )
}
