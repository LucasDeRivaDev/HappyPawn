'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { createReport } from '@/lib/firestore'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BottomNav } from '@/components/layout/BottomNav'

const REPORT_REASONS = [
  'El cliente fue agresivo o irrespetuoso',
  'El cliente intentó pactar fuera de la plataforma',
  'El cliente no apareció en el punto de encuentro',
  'Mascota en condiciones que generan riesgo',
  'Pago no recibido (efectivo)',
  'Otro problema',
]

export default function ProviderReportsPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [selectedReason, setSelectedReason] = useState('')
  const [description, setDescription] = useState('')
  const [reportedUid, setReportedUid] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSend() {
    if (!user || !selectedReason) {
      toast.error('Seleccioná un motivo')
      return
    }
    setSending(true)
    try {
      await createReport({
        reportedByUid: user.uid,
        reportedUid: reportedUid || 'unknown',
        reason: selectedReason,
        description: description || undefined,
        status: 'pending',
        createdAt: null as any,
      })
      setSent(true)
      toast.success('Reporte enviado')
    } catch {
      toast.error('Error al enviar el reporte')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 pb-20">
        <div className="text-center space-y-4">
          <div className="text-6xl">✅</div>
          <h2 className="text-2xl font-bold">Reporte enviado</h2>
          <p className="text-muted-foreground text-sm">
            El equipo de PawGo lo va a revisar en las próximas 24hs.
          </p>
          <Button onClick={() => { setSent(false); setSelectedReason(''); setDescription('') }}>
            Hacer otro reporte
          </Button>
          <Button variant="ghost" onClick={() => router.replace('/dashboard')}>
            Volver al dashboard
          </Button>
        </div>
        <BottomNav active="dashboard" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
          ←
        </button>
        <h1 className="font-bold text-lg">Reportar un problema</h1>
      </div>

      <div className="px-4 py-4 space-y-5">
        <div className="bg-orange-50 rounded-2xl p-3 border border-orange-100">
          <p className="text-sm text-orange-800">
            ⚠️ El sistema de reportes existe para mantener la comunidad segura. Los reportes falsos
            o malintencionados pueden resultar en suspensión de cuenta.
          </p>
        </div>

        {/* Motivo */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Motivo del reporte *
          </Label>
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => setSelectedReason(reason)}
              className={`w-full rounded-xl border-2 p-3 text-left text-sm transition-all ${
                selectedReason === reason
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              }`}
            >
              {reason}
            </button>
          ))}
        </div>

        {/* Descripción */}
        <div className="space-y-1">
          <Label>Descripción detallada (opcional)</Label>
          <textarea
            className="w-full bg-muted rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Contá qué pasó con el mayor detalle posible..."
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <Button
          className="w-full"
          onClick={handleSend}
          disabled={sending || !selectedReason}
        >
          {sending ? 'Enviando...' : 'Enviar reporte'}
        </Button>
      </div>

      <BottomNav active="dashboard" />
    </div>
  )
}
