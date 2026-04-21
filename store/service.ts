import { create } from 'zustand'
import type { Service, Provider } from '@/types'
import type { Coords } from '@/lib/geolocation'

interface ServiceState {
  // Servicio activo del owner (solicitud en curso)
  activeService: Service | null
  setActiveService: (service: Service | null) => void

  // Servicio activo del provider (trabajo en curso)
  activeJob: Service | null
  setActiveJob: (job: Service | null) => void

  // Proveedor asignado al servicio activo del owner
  assignedProvider: Provider | null
  setAssignedProvider: (provider: Provider | null) => void

  // Posición en tiempo real del proveedor (durante tracking)
  providerLiveLocation: Coords | null
  setProviderLiveLocation: (coords: Coords | null) => void

  // Posición del usuario
  userLocation: Coords | null
  setUserLocation: (coords: Coords | null) => void

  // Proveedores disponibles visibles en el mapa
  availableProviders: Provider[]
  setAvailableProviders: (providers: Provider[]) => void

  reset: () => void
}

export const useServiceStore = create<ServiceState>((set) => ({
  activeService: null,
  setActiveService: (activeService) => set({ activeService }),

  activeJob: null,
  setActiveJob: (activeJob) => set({ activeJob }),

  assignedProvider: null,
  setAssignedProvider: (assignedProvider) => set({ assignedProvider }),

  providerLiveLocation: null,
  setProviderLiveLocation: (providerLiveLocation) => set({ providerLiveLocation }),

  userLocation: null,
  setUserLocation: (userLocation) => set({ userLocation }),

  availableProviders: [],
  setAvailableProviders: (availableProviders) => set({ availableProviders }),

  reset: () =>
    set({
      activeService: null,
      activeJob: null,
      assignedProvider: null,
      providerLiveLocation: null,
      availableProviders: [],
    }),
}))
