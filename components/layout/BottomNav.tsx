'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'

type Tab = 'home' | 'history' | 'pets' | 'profile' | 'dashboard' | 'earnings'

interface NavItem {
  id: Tab
  emoji: string
  label: string
  href: string
  roles: string[]
}

const NAV_OWNER: NavItem[] = [
  { id: 'home', emoji: '🗺️', label: 'Mapa', href: '/home', roles: ['owner'] },
  { id: 'history', emoji: '📋', label: 'Historial', href: '/history', roles: ['owner'] },
  { id: 'pets', emoji: '🐾', label: 'Mascotas', href: '/pets', roles: ['owner'] },
  { id: 'profile', emoji: '👤', label: 'Perfil', href: '/profile', roles: ['owner'] },
]

const NAV_PROVIDER: NavItem[] = [
  {
    id: 'dashboard',
    emoji: '📍',
    label: 'Trabajos',
    href: '/dashboard',
    roles: ['walker', 'driver'],
  },
  {
    id: 'earnings',
    emoji: '💰',
    label: 'Ganancias',
    href: '/earnings',
    roles: ['walker', 'driver'],
  },
  {
    id: 'profile',
    emoji: '👤',
    label: 'Perfil',
    href: '/provider-profile',
    roles: ['walker', 'driver'],
  },
]

export function BottomNav({ active }: { active: Tab }) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)

  const isProvider = user?.role === 'walker' || user?.role === 'driver'
  const items = isProvider ? NAV_PROVIDER : NAV_OWNER

  return (
    <nav className="absolute bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border">
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {items.map((item) => {
          const isActive = item.id === active
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <span className="text-xl">{item.emoji}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
