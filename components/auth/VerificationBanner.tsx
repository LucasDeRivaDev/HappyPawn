'use client'

import { useRouter } from 'next/navigation'
import type { VerificationStatus } from '@/types'

export function VerificationBanner({ status }: { status?: VerificationStatus }) {
  const router = useRouter()

  if (status === 'approved') return null

  const config = {
    pending_review: {
      bg: 'bg-yellow-500',
      text: '⏳ Tu identidad está siendo verificada. Algunas funciones no están disponibles aún.',
    },
    rejected: {
      bg: 'bg-destructive',
      text: '❌ Tu verificación fue rechazada. Tocá para re-enviar los documentos.',
    },
  }[status ?? 'pending_review']

  return (
    <button
      onClick={() => router.push('/verify')}
      className={`w-full ${config.bg} text-white text-xs font-medium px-4 py-2 text-center`}
    >
      {config.text}
    </button>
  )
}
