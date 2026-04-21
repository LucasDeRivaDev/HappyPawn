/**
 * TODA la lógica de precios y comisiones vive acá.
 * Los valores nunca se hardcodean — siempre se leen desde config/ en Firestore.
 */
import type { PricingConfig, CommissionConfig, ServiceType } from '@/types'

// ─── Walk pricing ────────────────────────────────────────────────────────────

export function calculateWalkPrice(
  durationMinutes: 30 | 45 | 60,
  config: PricingConfig,
  providerAdjustPercent: number = 0
): number {
  const maxAdjust = config.walk.providerAdjustPercent
  const clampedAdjust = Math.max(-maxAdjust, Math.min(maxAdjust, providerAdjustPercent))

  let base: number
  switch (durationMinutes) {
    case 30:
      base = config.walk.base30min
      break
    case 45:
      base = config.walk.base45min
      break
    case 60:
      base = config.walk.base60min
      break
  }

  const adjusted = base * (1 + clampedAdjust / 100)
  return roundPrice(adjusted)
}

// ─── Vet transfer pricing ────────────────────────────────────────────────────

export function calculateVetTransferPrice(
  distanceKm: number,
  waitingMinutes: number,
  withReturn: boolean,
  config: PricingConfig
): number {
  const { baseFee, pricePerKm, waitingPricePerMin } = config.vetTransfer
  const distance = withReturn ? distanceKm * 2 : distanceKm
  const total = baseFee + distance * pricePerKm + waitingMinutes * waitingPricePerMin
  return roundPrice(total)
}

// ─── Pet transport pricing ───────────────────────────────────────────────────

export function calculatePetTransportPrice(
  distanceKm: number,
  config: PricingConfig
): number {
  const { baseFee, pricePerKm } = config.petTransport
  return roundPrice(baseFee + distanceKm * pricePerKm)
}

// ─── Commission ──────────────────────────────────────────────────────────────

export function calculateCommission(
  finalPrice: number,
  serviceType: ServiceType,
  commissionConfig: CommissionConfig
): { commissionPercent: number; commissionAmount: number; providerAmount: number } {
  const percent =
    commissionConfig.byServiceType?.[serviceType] ?? commissionConfig.globalPercent

  const commissionAmount = roundPrice(finalPrice * (percent / 100))
  const providerAmount = roundPrice(finalPrice - commissionAmount)

  return { commissionPercent: percent, commissionAmount, providerAmount }
}

// ─── Split with debt ─────────────────────────────────────────────────────────

export interface SplitResult {
  toPlatform: number
  toProvider: number
  debtCancelled: number
}

export function calculateSplit(
  finalPrice: number,
  serviceType: ServiceType,
  commissionConfig: CommissionConfig,
  pendingDebt: number
): SplitResult {
  const { commissionAmount, providerAmount } = calculateCommission(
    finalPrice,
    serviceType,
    commissionConfig
  )

  const debtCancelled = Math.min(pendingDebt, providerAmount)
  const toProvider = roundPrice(providerAmount - debtCancelled)
  const toPlatform = roundPrice(commissionAmount + debtCancelled)

  return { toPlatform, toProvider, debtCancelled }
}

// ─── Cash debt ───────────────────────────────────────────────────────────────

export function calculateCashDebt(
  finalPrice: number,
  serviceType: ServiceType,
  commissionConfig: CommissionConfig
): number {
  const { commissionAmount } = calculateCommission(finalPrice, serviceType, commissionConfig)
  return commissionAmount
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// ─── Default config (usado solo como fallback si Firestore no responde) ──────

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  walk: {
    base30min: 5000,
    base45min: 7000,
    base60min: 9000,
    providerAdjustPercent: 10,
  },
  vetTransfer: {
    baseFee: 3000,
    pricePerKm: 800,
    waitingPricePerMin: 150,
  },
  petTransport: {
    baseFee: 2000,
    pricePerKm: 600,
  },
}

export const DEFAULT_COMMISSION_CONFIG: CommissionConfig = {
  globalPercent: 5,
}
