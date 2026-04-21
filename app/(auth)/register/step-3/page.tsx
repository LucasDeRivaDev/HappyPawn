'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'

const CHECKBOXES = [
  {
    id: 'terms',
    text: 'Acepto los Términos y Condiciones de uso de PawGo.',
  },
  {
    id: 'privacy',
    text: 'Acepto la Política de Privacidad y el uso de mis datos personales y documentos de identidad para verificación de identidad.',
  },
  {
    id: 'commission',
    text: 'Entiendo que PawGo cobra una comisión del 5% sobre cada servicio realizado a través de la plataforma.',
  },
  {
    id: 'noCaptacion',
    text: 'Me comprometo a NO contactar ni contratar a otros usuarios de PawGo por fuera de la plataforma para evadir comisiones. Entiendo que esto está PROHIBIDO y puede resultar en la suspensión permanente de mi cuenta.',
  },
  {
    id: 'vetPolicy',
    text: 'Entiendo que 3 denuncias confirmadas por captación fuera de la app resultan en veto permanente e irreversible de mi cuenta.',
  },
  {
    id: 'realDocs',
    text: 'Confirmo que los datos y documentos que estoy cargando son reales y me pertenecen. Cargar documentos falsos es causal de suspensión inmediata y puede derivar en acciones legales.',
  },
]

export default function RegisterStep3() {
  const router = useRouter()
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const allChecked = CHECKBOXES.every((c) => checked[c.id])

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function handleSubmit() {
    if (!allChecked) return
    // Guardar aceptación de términos
    sessionStorage.setItem(
      'pawgo_register_terms',
      JSON.stringify({
        acceptedAt: new Date().toISOString(),
        termsVersion: '1.0',
      })
    )
    router.push('/register/step-4')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Paso 3 de 4</span>
            <span>Acuerdo legal</span>
          </div>
          <Progress value={75} className="h-1.5" />
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold">Términos y condiciones</h1>
          <p className="text-sm text-muted-foreground">
            Leé y aceptá cada punto por separado. Es obligatorio para continuar.
          </p>
        </div>

        <ScrollArea className="h-72 rounded-xl border border-border p-4">
          <div className="space-y-4">
            {CHECKBOXES.map((item) => (
              <label
                key={item.id}
                className="flex items-start gap-3 cursor-pointer group"
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                    checked[item.id]
                      ? 'bg-primary border-primary'
                      : 'border-muted-foreground group-hover:border-primary'
                  }`}
                  onClick={() => toggle(item.id)}
                >
                  {checked[item.id] && (
                    <svg
                      className="w-3 h-3 text-white"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span
                  className="text-sm leading-snug"
                  onClick={() => toggle(item.id)}
                >
                  {item.text}
                </span>
              </label>
            ))}
          </div>
        </ScrollArea>

        {!allChecked && (
          <p className="text-xs text-muted-foreground text-center">
            Debés marcar los {CHECKBOXES.length} puntos para continuar.
          </p>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push('/register/step-2')}
          >
            ← Atrás
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!allChecked}>
            Aceptar y continuar →
          </Button>
        </div>
      </div>
    </main>
  )
}
