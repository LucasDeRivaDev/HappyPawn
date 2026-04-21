'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { setUser, setProvider, setDniIndex, setVerification } from '@/lib/firestore'
import { Timestamp } from 'firebase/firestore'
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import type { UserRole } from '@/types'

const ROLES = [
  {
    value: 'owner' as UserRole,
    label: 'Dueño de mascota',
    emoji: '🐾',
    description: 'Quiero solicitar servicios para mi mascota.',
  },
  {
    value: 'walker' as UserRole,
    label: 'Paseador / Cuidador',
    emoji: '🦮',
    description: 'Quiero ofrecer paseos y servicios para mascotas.',
  },
  {
    value: 'driver' as UserRole,
    label: 'Conductor pet-friendly',
    emoji: '🚗',
    description: 'Quiero ofrecer transporte de mascotas.',
  },
]

export default function RegisterStep4() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleFinish() {
    if (!selectedRole) {
      toast.error('Elegí un rol para continuar.')
      return
    }

    const personal = JSON.parse(sessionStorage.getItem('pawgo_register') ?? '{}')
    const docs = JSON.parse(sessionStorage.getItem('pawgo_register_files') ?? '{}')
    const terms = JSON.parse(sessionStorage.getItem('pawgo_register_terms') ?? '{}')

    if (!personal.email || !personal.password || !personal.dni) {
      toast.error('Información incompleta. Volvé al paso 1.')
      router.push('/register/step-1')
      return
    }

    setLoading(true)
    try {
      // 1. Crear usuario en Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, personal.email, personal.password)
      const uid = cred.user.uid

      // 2. Subir documentos a Storage (carpeta privada)
      const uploadDoc = async (path: string, base64: string) => {
        const ref = storageRef(storage, `verifications/${uid}/${path}`)
        await uploadString(ref, base64, 'data_url')
        return getDownloadURL(ref)
      }

      const [frontUrl, backUrl, selfieUrl] = await Promise.all([
        uploadDoc('dni_front.jpg', docs.dniPhotoFront),
        uploadDoc('dni_back.jpg', docs.dniPhotoBack),
        uploadDoc('selfie.jpg', docs.selfiePhoto),
      ])

      // 3. Guardar datos en Firestore
      await Promise.all([
        // users/{uid}
        setUser(uid, {
          uid,
          name: personal.name,
          lastname: personal.lastname,
          email: personal.email,
          phone: personal.phone,
          dni: personal.dni,
          birthDate: personal.birthDate,
          role: selectedRole,
          isVerified: false,
          verificationStatus: 'pending_review',
          isSuspended: false,
          rating: 0,
          totalRatings: 0,
          termsAcceptedAt: Timestamp.now(),
          termsVersion: terms.termsVersion ?? '1.0',
          createdAt: Timestamp.now(),
          lastLoginAt: Timestamp.now(),
        } as any),

        // dni_index/{dni}
        setDniIndex(personal.dni, uid),

        // verifications/{uid}
        setVerification(uid, {
          uid,
          dniPhotoFront: frontUrl,
          dniPhotoBack: backUrl,
          selfiePhoto: selfieUrl,
          selfieTimestamp: Timestamp.fromDate(new Date(docs.selfieTimestamp)),
          selfieCoordinates: docs.selfieCoordinates ?? null,
          submittedAt: Timestamp.now(),
          status: 'pending_review',
        }),
      ])

      // 4. Si es proveedor, crear doc en providers/
      if (selectedRole === 'walker' || selectedRole === 'driver') {
        await setProvider(uid, {
          uid,
          bio: '',
          services: [],
          zones: [],
          isAvailable: false,
          totalEarnings: 0,
          pendingCommissionDebt: 0,
          mpAccountConnected: false,
        })
      }

      // 5. Limpiar sessionStorage
      sessionStorage.removeItem('pawgo_register')
      sessionStorage.removeItem('pawgo_register_docs')
      sessionStorage.removeItem('pawgo_register_files')
      sessionStorage.removeItem('pawgo_register_terms')

      // 6. Redirigir a verify (esperando aprobación)
      router.push('/verify')
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        toast.error('Ya existe una cuenta con ese email.')
      } else {
        toast.error('Error al crear la cuenta. Intentá de nuevo.')
        console.error(err)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Paso 4 de 4</span>
            <span>Tu rol</span>
          </div>
          <Progress value={100} className="h-1.5" />
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold">¿Cómo vas a usar PawGo?</h1>
          <p className="text-sm text-muted-foreground">
            Podés cambiar tu rol después desde tu perfil.
          </p>
        </div>

        <div className="space-y-3">
          {ROLES.map((role) => (
            <button
              key={role.value}
              type="button"
              onClick={() => setSelectedRole(role.value)}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                selectedRole === role.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{role.emoji}</span>
                <div>
                  <p className="font-semibold text-sm">{role.label}</p>
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                </div>
                {selectedRole === role.value && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push('/register/step-3')}
          >
            ← Atrás
          </Button>
          <Button
            className="flex-1"
            onClick={handleFinish}
            disabled={!selectedRole || loading}
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta ✓'}
          </Button>
        </div>
      </div>
    </main>
  )
}
