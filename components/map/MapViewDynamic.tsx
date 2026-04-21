'use client'

// Importación dinámica con ssr:false — obligatorio para Leaflet en Next.js
import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type { MapView } from './MapView'
import { Skeleton } from '@/components/ui/skeleton'

export const MapViewDynamic = dynamic(
  () => import('./MapView').then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="w-full h-full min-h-[300px] rounded-none" />
    ),
  }
)

export type MapViewProps = ComponentProps<typeof MapView>
