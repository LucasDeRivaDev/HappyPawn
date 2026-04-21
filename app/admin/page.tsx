'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import {
  getPendingVerifications,
  getPendingReports,
  setVerification,
  updateReport,
  updateUser,
  queryCollection,
  updateConfig,
} from '@/lib/firestore'
import { formatPrice, DEFAULT_PRICING_CONFIG, DEFAULT_COMMISSION_CONFIG } from '@/lib/pricing'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { where, orderBy, limit } from 'firebase/firestore'
import type { Verification, Report, User, Service } from '@/types'

export default function AdminPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)

  const [verifications, setVerifications] = useState<Verification[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  // Pricing form state
  const [walk30, setWalk30] = useState(String(DEFAULT_PRICING_CONFIG.walk.base30min))
  const [walk45, setWalk45] = useState(String(DEFAULT_PRICING_CONFIG.walk.base45min))
  const [walk60, setWalk60] = useState(String(DEFAULT_PRICING_CONFIG.walk.base60min))
  const [commission, setCommission] = useState(String(DEFAULT_COMMISSION_CONFIG.globalPercent))
  const [savingConfig, setSavingConfig] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) { router.replace('/login'); return }
    if (!user) return
    if (user.role !== 'admin') { router.replace('/home'); return }
    loadData()
  }, [user, authLoading, router])

  async function loadData() {
    const [v, r, u, s] = await Promise.all([
      getPendingVerifications(),
      getPendingReports(),
      queryCollection<User>('users', [orderBy('createdAt', 'desc'), limit(50)]),
      queryCollection<Service>('services', [orderBy('createdAt', 'desc'), limit(50)]),
    ])
    setVerifications(v)
    setReports(r)
    setUsers(u)
    setServices(s)
    setLoading(false)
  }

  async function handleApproveVerification(uid: string) {
    try {
      await setVerification(uid, { status: 'approved', reviewedAt: null as any, reviewedByAdminUid: user!.uid })
      await updateUser(uid, { verificationStatus: 'approved', isVerified: true })
      toast.success('Identidad aprobada')
      await loadData()
    } catch {
      toast.error('Error al aprobar')
    }
  }

  async function handleRejectVerification(uid: string, note: string) {
    try {
      await setVerification(uid, {
        status: 'rejected',
        rejectionNote: note,
        reviewedAt: null as any,
        reviewedByAdminUid: user!.uid,
      })
      await updateUser(uid, { verificationStatus: 'rejected' })
      toast.success('Verificación rechazada')
      await loadData()
    } catch {
      toast.error('Error al rechazar')
    }
  }

  async function handleDismissReport(reportId: string) {
    try {
      await updateReport(reportId, { status: 'dismissed', reviewedByAdminUid: user!.uid, reviewedAt: null as any })
      toast.success('Reporte desestimado')
      await loadData()
    } catch {
      toast.error('Error')
    }
  }

  async function handleConfirmReport(reportId: string) {
    try {
      await updateReport(reportId, { status: 'confirmed', reviewedByAdminUid: user!.uid, reviewedAt: null as any })
      toast.success('Reporte confirmado')
      await loadData()
    } catch {
      toast.error('Error')
    }
  }

  async function handleToggleSuspend(u: User) {
    try {
      const newState = !u.isSuspended
      await updateUser(u.uid, {
        isSuspended: newState,
        suspensionReason: newState ? 'Suspendido por el administrador' : undefined,
      })
      toast.success(newState ? `${u.name} suspendido` : `${u.name} reactivado`)
      await loadData()
    } catch {
      toast.error('Error al actualizar usuario')
    }
  }

  async function handleSaveConfig() {
    setSavingConfig(true)
    try {
      await Promise.all([
        updateConfig('pricing', {
          walk: {
            ...DEFAULT_PRICING_CONFIG.walk,
            base30min: Number(walk30),
            base45min: Number(walk45),
            base60min: Number(walk60),
          },
          vetTransfer: DEFAULT_PRICING_CONFIG.vetTransfer,
          petTransport: DEFAULT_PRICING_CONFIG.petTransport,
        }),
        updateConfig('commission', {
          globalPercent: Number(commission),
        }),
      ])
      toast.success('Configuración guardada')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSavingConfig(false)
    }
  }

  if (!user || user.role !== 'admin') return null

  const pendingVerCount = verifications.length
  const pendingRepCount = reports.length

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold text-xl">🛡 Admin Panel</h1>
        <span className="text-xs text-muted-foreground">
          {pendingVerCount + pendingRepCount} pendientes
        </span>
      </div>

      <Tabs defaultValue="verifications" className="flex-1">
        <div className="sticky top-14 z-10 bg-background border-b border-border">
          <TabsList className="w-full rounded-none border-0 bg-transparent h-auto p-0 gap-0 overflow-x-auto flex">
            {[
              { value: 'verifications', label: 'Verificaciones', badge: pendingVerCount },
              { value: 'reports', label: 'Reportes', badge: pendingRepCount },
              { value: 'users', label: 'Usuarios' },
              { value: 'services', label: 'Servicios' },
              { value: 'config', label: 'Config' },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs font-medium whitespace-nowrap"
              >
                {tab.label}
                {tab.badge ? (
                  <span className="ml-1 bg-destructive text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    {tab.badge}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Verificaciones */}
        <TabsContent value="verifications" className="px-4 py-4 space-y-3 mt-0">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-48 bg-muted rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : verifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-4xl mb-2">✅</p>
              <p>No hay verificaciones pendientes</p>
            </div>
          ) : (
            verifications.map((v) => (
              <VerificationCard
                key={v.uid}
                verification={v}
                onApprove={() => handleApproveVerification(v.uid)}
                onReject={(note) => handleRejectVerification(v.uid, note)}
              />
            ))
          )}
        </TabsContent>

        {/* Reportes */}
        <TabsContent value="reports" className="px-4 py-4 space-y-3 mt-0">
          {reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-4xl mb-2">✅</p>
              <p>No hay reportes pendientes</p>
            </div>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{r.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      Reportado por: {r.reportedByUid.slice(0, 8)}...
                    </p>
                  </div>
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                    Pendiente
                  </span>
                </div>
                {r.description && (
                  <p className="text-sm text-muted-foreground">{r.description}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30"
                    onClick={() => handleConfirmReport(r.id)}
                  >
                    Confirmar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismissReport(r.id)}
                  >
                    Desestimar
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* Usuarios */}
        <TabsContent value="users" className="px-4 py-4 space-y-2 mt-0">
          {users.map((u) => (
            <div key={u.uid} className="bg-card rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{u.name} {u.lastname}</p>
                  <p className="text-xs text-muted-foreground">{u.email} · {u.role}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    u.verificationStatus === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : u.verificationStatus === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {u.verificationStatus}
                  </span>
                  {u.isSuspended && (
                    <span className="block text-xs text-destructive mt-0.5">Suspendido</span>
                  )}
                </div>
              </div>
              {u.role !== 'admin' && (
                <Button
                  size="sm"
                  variant="outline"
                  className={u.isSuspended
                    ? 'text-green-600 border-green-300 hover:bg-green-50 w-full'
                    : 'text-destructive border-destructive/30 hover:bg-destructive/5 w-full'
                  }
                  onClick={() => handleToggleSuspend(u)}
                >
                  {u.isSuspended ? '✓ Reactivar cuenta' : '⛔ Suspender cuenta'}
                </Button>
              )}
            </div>
          ))}
        </TabsContent>

        {/* Servicios */}
        <TabsContent value="services" className="px-4 py-4 space-y-2 mt-0">
          {services.map((s) => (
            <div key={s.id} className="bg-card rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm capitalize">{s.serviceType.replace('_', ' ')}</p>
                  <p className="text-xs text-muted-foreground">{s.originAddress || s.id}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{formatPrice(s.finalPrice)}</p>
                  <span className={`text-xs ${
                    s.status === 'completed' ? 'text-green-600' :
                    s.status === 'cancelled' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {s.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Configuración */}
        <TabsContent value="config" className="px-4 py-4 space-y-4 mt-0">
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <p className="font-semibold">Precios de paseos (ARS)</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>30 min</Label>
                <Input value={walk30} onChange={(e) => setWalk30(e.target.value)} type="number" />
              </div>
              <div className="space-y-1">
                <Label>45 min</Label>
                <Input value={walk45} onChange={(e) => setWalk45(e.target.value)} type="number" />
              </div>
              <div className="space-y-1">
                <Label>60 min</Label>
                <Input value={walk60} onChange={(e) => setWalk60(e.target.value)} type="number" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <p className="font-semibold">Comisión plataforma</p>
            <div className="space-y-1">
              <Label>Porcentaje global (%)</Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Se aplica a todos los servicios a menos que se configure por tipo.
            </p>
          </div>

          <Button className="w-full" onClick={handleSaveConfig} disabled={savingConfig}>
            {savingConfig ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Verification Card ────────────────────────────────────────────────────────

function VerificationCard({
  verification,
  onApprove,
  onReject,
}: {
  verification: Verification
  onApprove: () => void
  onReject: (note: string) => void
}) {
  const [rejectNote, setRejectNote] = useState('')
  const [showReject, setShowReject] = useState(false)

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm">UID: {verification.uid.slice(0, 12)}...</p>
        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
          Pendiente
        </span>
      </div>

      {/* Fotos */}
      <div className="grid grid-cols-3 gap-2">
        {[verification.dniPhotoFront, verification.dniPhotoBack, verification.selfiePhoto].map(
          (photo, i) => (
            <div key={i} className="aspect-video bg-muted rounded-lg overflow-hidden">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt={['DNI frente', 'DNI dorso', 'Selfie'][i]}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  Sin foto
                </div>
              )}
            </div>
          )
        )}
      </div>

      <div className="flex gap-2">
        {!showReject ? (
          <>
            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={onApprove}>
              ✓ Aprobar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-destructive border-destructive/30"
              onClick={() => setShowReject(true)}
            >
              ✗ Rechazar
            </Button>
          </>
        ) : (
          <div className="flex-1 space-y-2">
            <Input
              placeholder="Motivo del rechazo..."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onReject(rejectNote)}
                disabled={!rejectNote.trim()}
              >
                Confirmar rechazo
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowReject(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
