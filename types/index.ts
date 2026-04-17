import { Timestamp, GeoPoint } from 'firebase/firestore'

// ─── Roles ─────────────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'walker' | 'driver' | 'admin'
export type VerificationStatus = 'pending_review' | 'approved' | 'rejected'
export type ServiceType = 'walk' | 'vet_transfer' | 'pet_transport'
export type PaymentMethod = 'online' | 'cash'
export type PaymentStatus = 'pending' | 'paid' | 'failed'
export type ServiceStatus =
  | 'requested'
  | 'accepted'
  | 'provider_on_way'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'confirmed'

// ─── User ───────────────────────────────────────────────────────────────────

export interface User {
  uid: string
  name: string
  lastname: string
  email: string
  phone: string
  dni: string
  role: UserRole
  photoURL?: string
  createdAt: Timestamp
  lastLoginAt: Timestamp
  isVerified: boolean
  verificationStatus: VerificationStatus
  isSuspended: boolean
  suspensionReason?: string
  termsAcceptedAt?: Timestamp
  termsVersion?: string
  termsAcceptedIp?: string
  rating: number
  totalRatings: number
}

// ─── Provider ───────────────────────────────────────────────────────────────

export interface VehicleInfo {
  brand: string
  model: string
  year: number
  color: string
  plate: string
  hasProtector: boolean
  photos: string[]
  acceptedPetTypes: ('dog' | 'cat')[]
  acceptedSizes: ('small' | 'medium' | 'large')[]
}

export interface Provider {
  uid: string
  bio: string
  services: ServiceType[]
  zones: GeoPoint[]
  vehicleInfo?: VehicleInfo
  isAvailable: boolean
  currentLocation?: GeoPoint
  lastLocationUpdate?: Timestamp
  totalEarnings: number
  pendingCommissionDebt: number
  mpAccountConnected: boolean
  mpAccessToken?: string // encriptado en Firestore
  providerAdjustPercent: number // ±10 sobre el precio base
}

// ─── Pet ────────────────────────────────────────────────────────────────────

export type PetSize = 'small' | 'medium' | 'large'

export interface Pet {
  id: string
  ownerId: string
  name: string
  breed: string
  age: number
  weight: number
  size: PetSize
  photos: string[]
  medicalNotes?: string
  vaccinations?: string[]
}

// ─── Service ────────────────────────────────────────────────────────────────

export interface ServiceAuditEvent {
  status: ServiceStatus
  uid: string
  timestamp: Timestamp
  note?: string
}

export interface Service {
  id: string
  serviceType: ServiceType
  status: ServiceStatus
  ownerId: string
  providerId?: string
  petIds: string[]
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  durationMinutes?: number
  distanceKm?: number
  basePrice: number
  finalPrice: number
  commissionPercent: number
  commissionAmount: number
  debtCancelledAmount: number
  mpPreferenceId?: string
  mpSplitExecuted: boolean
  route: GeoPoint[]
  originAddress: string
  destinationAddress?: string
  originCoords: GeoPoint
  destinationCoords?: GeoPoint
  rating?: number
  review?: string
  requestedAt: Timestamp
  acceptedAt?: Timestamp
  startedAt?: Timestamp
  finishedAt?: Timestamp
  createdAt: Timestamp
}

// ─── Transaction ────────────────────────────────────────────────────────────

export interface Transaction {
  id: string
  serviceId: string
  serviceType: ServiceType
  ownerId: string
  providerId: string
  petId: string
  startedAt: Timestamp
  finishedAt: Timestamp
  durationMinutes: number
  distanceKm: number
  basePrice: number
  finalPrice: number
  commissionPercent: number
  commissionAmount: number
  commissionDeducted: boolean
  debtCancelledAmount: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  mpPreferenceId?: string
  mpSplitExecuted: boolean
  route: GeoPoint[]
  rating?: number
  review?: string
  acceptedAt: Timestamp
  createdAt: Timestamp
}

// ─── Report ─────────────────────────────────────────────────────────────────

export interface Report {
  id: string
  reportedByUid: string
  reportedUid: string
  serviceId?: string
  reason: string
  description?: string
  status: ReportStatus
  createdAt: Timestamp
  reviewedByAdminUid?: string
  reviewedAt?: Timestamp
}

// ─── Rating ─────────────────────────────────────────────────────────────────

export interface Rating {
  id: string
  serviceId: string
  fromUserId: string
  toUserId: string
  score: number
  comment?: string
  createdAt: Timestamp
}

// ─── Verification ───────────────────────────────────────────────────────────

export interface Verification {
  uid: string
  dniPhotoFront: string
  dniPhotoBack: string
  selfiePhoto: string
  selfieTimestamp: Timestamp
  selfieCoordinates?: { lat: number; lng: number }
  submittedAt: Timestamp
  reviewedAt?: Timestamp
  reviewedByAdminUid?: string
  status: VerificationStatus
  rejectionNote?: string
}

// ─── Config ─────────────────────────────────────────────────────────────────

export interface PricingConfig {
  walk: {
    base30min: number
    base45min: number
    base60min: number
    providerAdjustPercent: number // ±10 por defecto
  }
  vetTransfer: {
    baseFee: number
    pricePerKm: number
    waitingPricePerMin: number
  }
  petTransport: {
    baseFee: number
    pricePerKm: number
  }
}

export interface CommissionConfig {
  globalPercent: number // 5 por defecto
  byServiceType?: {
    walk?: number
    vet_transfer?: number
    pet_transport?: number
  }
}

export interface ZoneConfig {
  id: string
  name: string
  city: string
  isActive: boolean
  searchRadiusKm: number
  center: { lat: number; lng: number }
}

export interface RulesConfig {
  reportVetThreshold: number // 3 por defecto
  autoVetEnabled: boolean
  maxActiveServicesPerOwner: number
  maxActiveServicesPerProvider: number
}

export interface LegalConfig {
  termsVersion: string
  termsUpdatedAt: Timestamp
  termsContent: string
  privacyVersion: string
  privacyUpdatedAt: Timestamp
  privacyContent: string
}

export interface PaymentsConfig {
  cashEnabled: boolean
  onlineEnabled: boolean
  mpConnected: boolean
}
