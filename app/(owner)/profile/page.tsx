'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useAuthStore } from '@/store/auth'
import { updateUser } from '@/lib/firestore'
import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BottomNav } from '@/components/layout/BottomNav'
import { createReport } from '@/lib/firestore'

export default function OwnerProfilePage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const reset = useAuthStore((s) => s.reset)
  const { theme, setTheme } = useTheme()

  const [editing, setEditing] = useState(false)
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [saving, setSaving] = useState(false)

  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDesc, setReportDesc] = useState('')
  const [sendingReport, setSendingReport] = useState(false)

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      await updateUser(user.uid, { phone })
      setUser({ ...user, phone })
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

  async function handleReport() {
    if (!user || !reportReason.trim()) {
      toast.error('Describí el motivo del reporte')
      return
    }
    setSendingReport(true)
    try {
      await createReport({
        reportedByUid: user.uid,
        reportedUid: 'platform',
        reason: reportReason,
        description: reportDesc,
        status: 'pending',
        createdAt: null as any,
      })
      toast.success('Reporte enviado — el equipo lo revisará')
      setShowReport(false)
      setReportReason('')
      setReportDesc('')
    } catch {
      toast.error('Error al enviar reporte')
    } finally {
      setSendingReport(false)
    }
  }

  if (!user) return null

  const verificationConfig = {
    pending_review: { label: 'En revisión', color: 'text-yellow-600 bg-yellow-50' },
    approved: { label: 'Verificado ✓', color: 'text-green-600 bg-green-50' },
    rejected: { label: 'Rechazado', color: 'text-red-600 bg-red-50' },
  }[user.verificationStatus]

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <h1 className="font-bold text-lg">Mi perfil</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Avatar y nombre */}
        <div className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl">
            👤
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg">{user.name} {user.lastname}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${verificationConfig.color}`}>
              {verificationConfig.label}
            </span>
          </div>
        </div>

        {/* Rating */}
        {user.totalRatings > 0 && (
          <div className="flex items-center gap-2 p-4 bg-card rounded-2xl border border-border">
            <span className="text-2xl">⭐</span>
            <div>
              <p className="font-bold">{user.rating.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">{user.totalRatings} calificaciones</p>
            </div>
          </div>
        )}

        {/* Datos editables */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Datos personales</p>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-primary text-sm font-medium hover:underline"
              >
                Editar
              </button>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">DNI: </span>
              <span className="font-medium">{user.dni}</span>
            </div>
            {editing ? (
              <div className="space-y-1">
                <Label>Teléfono</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+54 9 342 000 0000"
                />
              </div>
            ) : (
              <div>
                <span className="text-muted-foreground">Teléfono: </span>
                <span className="font-medium">{user.phone}</span>
              </div>
            )}
          </div>

          {editing && (
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          )}
        </div>

        {/* Reporte */}
        {showReport ? (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <p className="font-semibold">Reportar un problema</p>
            <div className="space-y-1">
              <Label>Motivo *</Label>
              <Input
                placeholder="Ej: problema con un proveedor"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Descripción (opcional)</Label>
              <textarea
                className="w-full bg-muted rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Contanos qué pasó..."
                rows={3}
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleReport} disabled={sendingReport}>
                {sendingReport ? 'Enviando...' : 'Enviar reporte'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowReport(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowReport(true)}
            className="w-full p-4 bg-card rounded-2xl border border-border text-left flex items-center gap-3 hover:border-orange-300 transition-colors"
          >
            <span className="text-xl">🚨</span>
            <div>
              <p className="font-medium text-sm">Reportar un problema</p>
              <p className="text-xs text-muted-foreground">Incidentes, irregularidades o quejas</p>
            </div>
          </button>
        )}

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

        {/* Cerrar sesión */}
        <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/5" onClick={handleLogout}>
          Cerrar sesión
        </Button>
      </div>

      <BottomNav active="profile" />
    </div>
  )
}
