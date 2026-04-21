'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

const schema = z
  .object({
    name: z.string().min(2, 'Ingresá tu nombre'),
    lastname: z.string().min(2, 'Ingresá tu apellido'),
    email: z.string().email('Email inválido'),
    phone: z.string().min(8, 'Teléfono inválido'),
    dni: z.string().regex(/^\d{7,8}$/, 'DNI: 7 u 8 dígitos, sin puntos'),
    birthDate: z.string().min(1, 'Ingresá tu fecha de nacimiento'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

export default function RegisterStep1() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  function onSubmit(data: FormData) {
    // Guardar en sessionStorage para usar en pasos siguientes
    sessionStorage.setItem(
      'pawgo_register',
      JSON.stringify({
        name: data.name,
        lastname: data.lastname,
        email: data.email,
        phone: data.phone,
        dni: data.dni,
        birthDate: data.birthDate,
        password: data.password,
      })
    )
    router.push('/register/step-2')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Paso 1 de 4</span>
            <span>Datos personales</span>
          </div>
          <Progress value={25} className="h-1.5" />
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold">Crear cuenta en PawGo</h1>
          <p className="text-sm text-muted-foreground">
            Primero necesitamos tus datos personales.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" placeholder="Juan" {...register('name')} />
              {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastname">Apellido</Label>
              <Input id="lastname" placeholder="Pérez" {...register('lastname')} />
              {errors.lastname && (
                <p className="text-destructive text-xs">{errors.lastname.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="vos@ejemplo.com" {...register('email')} />
            {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone">Teléfono (con código de área)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="3425952845"
              inputMode="numeric"
              {...register('phone')}
            />
            {errors.phone && <p className="text-destructive text-xs">{errors.phone.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="dni">DNI</Label>
              <Input
                id="dni"
                placeholder="38000000"
                inputMode="numeric"
                {...register('dni')}
              />
              {errors.dni && <p className="text-destructive text-xs">{errors.dni.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="birthDate">Nacimiento</Label>
              <Input id="birthDate" type="date" {...register('birthDate')} />
              {errors.birthDate && (
                <p className="text-destructive text-xs">{errors.birthDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-destructive text-xs">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Repetir contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full">
            Siguiente →
          </Button>
        </form>
      </div>
    </main>
  )
}
