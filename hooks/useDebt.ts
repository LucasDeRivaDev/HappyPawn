'use client'

import { useAuthStore } from '@/store/auth'

export function useDebt() {
  const provider = useAuthStore((s) => s.provider)
  const debt = provider?.pendingCommissionDebt ?? 0

  return {
    debt,
    hasDebt: debt > 0,
  }
}
