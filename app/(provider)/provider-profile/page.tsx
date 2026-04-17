'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useAuthStore } from '@/store/auth'
import { updateUser, updateProvider } from '@/lib/firestore'
import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BottomNav } from '@/components/layout/BottomNav'
import { formatPrice } from '@/lib/pricing'

export default function ProviderProfilePage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const provider = useAuthStore((s) => s.provider)
  const reset = useAuthStore((s) => s.reset)

  const searchParams = useSearchParams()
  const { theme, setTheme } = useTheme()

  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState(provider?.bio ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (searchParams.get('mpConnected') === 'true') {
      toast.success('¡MercadoPago conectado exitosamente!')
    } else if (searchParams.get('mpError')) {
      toast.error('Error al conectar MercadoPago. Intentá de nuevo.')
    }
  }, [])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      await Promise.all([
        updateUser(user.uid, { phone }),
        provider ? updateProvider(user.uid, { bio }) : Promise.resolve(),
      ])
      toast.success('Perfil actualizado')
      setEditing(false)
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth)
      reset()
      router.replace('/')
    } catch {
      toast.error('Error al cerrar sesión')
    }
  }

  if (!user) return null

  const verificationConfig = {
    pending_review: { label: 'En revisión', color: 'text-yellow-600 bg-yellow-50' },
    approved: { label: 'Verificado ✓', color: 'text-green-600 bg-green-50' },
    rejected: { label: 'Rechazado', color: 'text-red-600 bg-red-50' },
  }[user.verificationStatus]

  const roleLabel = user.role === 'walker' ? '🦮 Paseador' : '🚗 Conductor'

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <h1 className="font-bold text-lg">Mi perfil</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Avatar */}
        <div className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl">
            👤
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg">{user.name} {user.lastname}</p>
            <p className="text-sm text-muted-foreground">{roleLabel}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${verificationConfig.color}`}>
              {verificationConfig.label}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl p-3 border border-border text-center">
            <p className="text-xl font-bold text-primary">
              {formatPrice(provider?.totalEarnings ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">Ganado</p>
          </div>
          <div className="bg-card rounded-2xl p-3 border border-border text-center">
            <p className="text-xl font-bold">
              {user.rating > 0 ? user.rating.toFixed(1) : '—'}
            </p>
            <p className="text-xs text-muted-foreground">Rating</p>
          </div>
          <div className="bg-card rounded-2xl p-3 border border-border text-center">
            <p className="text-xl font-bold">{user.totalRatings}</p>
            <p className="text-xs text-muted-foreground">Servicios</p>
          </div>
        </div>

        {/* Datos */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Datos</p>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-primary text-sm font-medium hover:underline"
              >
                Editar
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Teléfono</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Bio</Label>
                <textarea
                  className="w-full bg-muted rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Contá algo sobre vos..."
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Email: </span>
                <span className="font-medium">{user.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Teléfono: </span>
                <span className="font-medium">{user.phone}</span>
              </div>
              {provider?.bio && (
                <div>
                  <span className="text-muted-foreground">Bio: </span>
                  <span className="font-medium">{provider.bio}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MercadoPago */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <p className="font-semibold">Pagos</p>
          {provider?.mpAccountConnected ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-sm font-medium">MercadoPago conectado</p>
                <p className="text-xs text-muted-foreground">
                  Podés recibir pagos online de tus clientes
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💳</span>
                <div>
                  <p className="text-sm font-medium">MercadoPago no conectado</p>
                  <p className="text-xs text-muted-foreground">
                    Conectá tu cuenta para recibir pagos online
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/connect-mp')}
              >
                Conectar MercadoPago
              </Button>
            </div>
          )}
        </div>

        {/* Tema */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-full p-4 bg-card rounded-2xl border border-border text-left flex items-center justify-between hover:border-primary/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{theme === 'dark' ? '☀️' : '🌙'}</span>
            <p className="font-medium text-sm">{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</p>
          </div>
          <span className="text-xs text-muted-foreground">Cambiar</span>
        </button>

        <Button
          variant="outline"
          className="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={handleLogout}
        >
          Cerrar sesión
        </Button>
      </div>

      <BottomNav active="profile" />
    </div>
  )
}
