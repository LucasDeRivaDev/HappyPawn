'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { getCurrentPosition } from '@/lib/geolocation'

type UploadState = {
  dniPhotoFront: File | null
  dniPhotoBack: File | null
  selfiePhoto: File | null
}

export default function RegisterStep2() {
  const router = useRouter()
  const [uploads, setUploads] = useState<UploadState>({
    dniPhotoFront: null,
    dniPhotoBack: null,
    selfiePhoto: null,
  })
  const [previews, setPreviews] = useState<Partial<Record<keyof UploadState, string>>>({})
  const [loading, setLoading] = useState(false)
  const selfieRef = useRef<HTMLInputElement>(null)

  function handleFile(key: keyof UploadState, file: File | null) {
    if (!file) return
    setUploads((prev) => ({ ...prev, [key]: file }))
    const url = URL.createObjectURL(file)
    setPreviews((prev) => ({ ...prev, [key]: url }))
  }

  async function handleSubmit() {
    if (!uploads.dniPhotoFront || !uploads.dniPhotoBack || !uploads.selfiePhoto) {
      toast.error('Tenés que subir las tres fotos para continuar.')
      return
    }

    // Obtener coordenadas GPS para la selfie
    let coords: { lat: number; lng: number } | null = null
    try {
      coords = await getCurrentPosition()
    } catch {
      // No bloqueamos si el GPS falla, solo no guardamos coords
    }

    // Guardar en sessionStorage para usarlos en el paso final
    const selfieTimestamp = new Date().toISOString()
    sessionStorage.setItem(
      'pawgo_register_docs',
      JSON.stringify({
        selfieTimestamp,
        selfieCoordinates: coords,
      })
    )

    // Guardar archivos en sessionStorage como base64 para subirlos en step-4
    const toBase64 = (file: File): Promise<string> =>
      new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result as string)
        reader.onerror = rej
        reader.readAsDataURL(file)
      })

    const [front, back, selfie] = await Promise.all([
      toBase64(uploads.dniPhotoFront),
      toBase64(uploads.dniPhotoBack),
      toBase64(uploads.selfiePhoto),
    ])

    sessionStorage.setItem(
      'pawgo_register_files',
      JSON.stringify({
        dniPhotoFront: front,
        dniPhotoBack: back,
        selfiePhoto: selfie,
        selfieTimestamp,
        selfieCoordinates: coords,
      })
    )

    router.push('/register/step-3')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Paso 2 de 4</span>
            <span>Verificación de identidad</span>
          </div>
          <Progress value={50} className="h-1.5" />
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold">Verificá tu identidad</h1>
          <p className="text-sm text-muted-foreground">
            Este paso es obligatorio para todos los usuarios. Tus documentos son privados
            y solo los ve el equipo de PawGo.
          </p>
        </div>

        <div className="space-y-4">
          {/* DNI Frente */}
          <PhotoUpload
            label="Foto DNI — Frente"
            description="Mostrá tu nombre, número y foto del documento."
            accept="image/*"
            capture="environment"
            preview={previews.dniPhotoFront}
            onChange={(f) => handleFile('dniPhotoFront', f)}
          />

          {/* DNI Dorso */}
          <PhotoUpload
            label="Foto DNI — Dorso"
            description="Fotografiá el reverso del DNI."
            accept="image/*"
            capture="environment"
            preview={previews.dniPhotoBack}
            onChange={(f) => handleFile('dniPhotoBack', f)}
          />

          {/* Selfie en tiempo real */}
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium">Selfie en tiempo real</p>
              <p className="text-xs text-muted-foreground">
                Tomada en este momento con tu cámara frontal. No podés subir una foto de
                galería. Asegurate de tener buena iluminación y que se vea tu cara completa.
              </p>
            </div>
            <input
              ref={selfieRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => handleFile('selfiePhoto', e.target.files?.[0] ?? null)}
            />
            {previews.selfiePhoto ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previews.selfiePhoto}
                  alt="Selfie"
                  className="w-full h-40 object-cover rounded-xl border border-border"
                />
                <button
                  type="button"
                  onClick={() => selfieRef.current?.click()}
                  className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => selfieRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <span className="text-2xl">🤳</span>
                <span className="text-sm">Tomar selfie ahora</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push('/register/step-1')}
          >
            ← Atrás
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Procesando...' : 'Siguiente →'}
          </Button>
        </div>
      </div>
    </main>
  )
}

// ─── Componente reutilizable de subida de foto ───────────────────────────────

function PhotoUpload({
  label,
  description,
  accept,
  capture,
  preview,
  onChange,
}: {
  label: string
  description: string
  accept: string
  capture: 'environment' | 'user'
  preview?: string
  onChange: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture={capture}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onChange(file)
        }}
      />
      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={label}
            className="w-full h-32 object-cover rounded-xl border border-border"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-24 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <span className="text-xl">📷</span>
          <span className="text-sm">Tomar o elegir foto</span>
        </button>
      )}
    </div>
  )
}
