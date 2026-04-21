/**
 * Wrapper centralizado para todos los accesos a Firestore.
 * NUNCA acceder a Firestore directamente desde componentes — siempre usar estas funciones.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  type DocumentData,
  type QueryConstraint,
  type Unsubscribe,
  GeoPoint,
} from 'firebase/firestore'
import { db } from './firebase'
import type {
  User,
  Provider,
  Pet,
  Service,
  Transaction,
  Report,
  Rating,
  Verification,
  PricingConfig,
  CommissionConfig,
  ZoneConfig,
  RulesConfig,
  LegalConfig,
  PaymentsConfig,
} from '@/types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function docRef(path: string, ...segments: string[]) {
  return doc(db, path, ...segments)
}

function colRef(path: string) {
  return collection(db, path)
}

// ─── Users ──────────────────────────────────────────────────────────────────

export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(docRef('users', uid))
  return snap.exists() ? (snap.data() as User) : null
}

export async function setUser(uid: string, data: Partial<User>): Promise<void> {
  await setDoc(docRef('users', uid), { ...data, uid }, { merge: true })
}

export async function updateUser(uid: string, data: Partial<User>): Promise<void> {
  await updateDoc(docRef('users', uid), data as DocumentData)
}

export function subscribeToUser(uid: string, callback: (user: User | null) => void): Unsubscribe {
  return onSnapshot(docRef('users', uid), (snap) => {
    callback(snap.exists() ? (snap.data() as User) : null)
  })
}

// ─── Providers ──────────────────────────────────────────────────────────────

export async function getProvider(uid: string): Promise<Provider | null> {
  const snap = await getDoc(docRef('providers', uid))
  return snap.exists() ? (snap.data() as Provider) : null
}

export async function setProvider(uid: string, data: Partial<Provider>): Promise<void> {
  await setDoc(docRef('providers', uid), { ...data, uid }, { merge: true })
}

export async function updateProvider(uid: string, data: Partial<Provider>): Promise<void> {
  await updateDoc(docRef('providers', uid), data as DocumentData)
}

export async function updateProviderLocation(
  uid: string,
  lat: number,
  lng: number
): Promise<void> {
  await updateDoc(docRef('providers', uid), {
    currentLocation: new GeoPoint(lat, lng),
    lastLocationUpdate: serverTimestamp(),
  })
}

export function subscribeToAvailableProviders(
  callback: (providers: Provider[]) => void
): Unsubscribe {
  const q = query(colRef('providers'), where('isAvailable', '==', true))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as Provider))
  })
}

export function subscribeToProvider(
  uid: string,
  callback: (provider: Provider | null) => void
): Unsubscribe {
  return onSnapshot(docRef('providers', uid), (snap) => {
    callback(snap.exists() ? (snap.data() as Provider) : null)
  })
}

// ─── Pets ────────────────────────────────────────────────────────────────────

export async function getPetsByOwner(ownerId: string): Promise<Pet[]> {
  const q = query(colRef('pets'), where('ownerId', '==', ownerId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Pet)
}

export async function addPet(data: Omit<Pet, 'id'>): Promise<string> {
  const ref = await addDoc(colRef('pets'), { ...data, createdAt: serverTimestamp() })
  return ref.id
}

export async function updatePet(petId: string, data: Partial<Pet>): Promise<void> {
  await updateDoc(docRef('pets', petId), data as DocumentData)
}

export async function deletePet(petId: string): Promise<void> {
  await deleteDoc(docRef('pets', petId))
}

// ─── Services ───────────────────────────────────────────────────────────────

export async function getService(serviceId: string): Promise<Service | null> {
  const snap = await getDoc(docRef('services', serviceId))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Service) : null
}

export async function createService(data: Omit<Service, 'id'>): Promise<string> {
  const ref = await addDoc(colRef('services'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  // Audit log
  await addDoc(collection(db, 'services', ref.id, 'audit_log'), {
    status: data.status,
    uid: data.ownerId,
    timestamp: serverTimestamp(),
    note: 'Service created',
  })
  return ref.id
}

export async function updateService(serviceId: string, data: Partial<Service>): Promise<void> {
  await updateDoc(docRef('services', serviceId), data as DocumentData)
}

export async function updateServiceStatus(
  serviceId: string,
  status: Service['status'],
  actorUid: string,
  note?: string
): Promise<void> {
  await updateDoc(docRef('services', serviceId), { status })
  await addDoc(collection(db, 'services', serviceId, 'audit_log'), {
    status,
    uid: actorUid,
    timestamp: serverTimestamp(),
    note: note ?? null,
  })
}

export function subscribeToService(
  serviceId: string,
  callback: (service: Service | null) => void
): Unsubscribe {
  return onSnapshot(docRef('services', serviceId), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as Service) : null)
  })
}

export async function getActiveServiceForOwner(ownerId: string): Promise<Service | null> {
  const activeStatuses: Service['status'][] = [
    'requested',
    'accepted',
    'provider_on_way',
    'in_progress',
  ]
  const q = query(
    colRef('services'),
    where('ownerId', '==', ownerId),
    where('status', 'in', activeStatuses),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Service
}

export async function getActiveServiceForProvider(providerId: string): Promise<Service | null> {
  const activeStatuses: Service['status'][] = ['accepted', 'provider_on_way', 'in_progress']
  const q = query(
    colRef('services'),
    where('providerId', '==', providerId),
    where('status', 'in', activeStatuses),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Service
}

export function subscribeToNearbyRequests(
  callback: (services: Service[]) => void
): Unsubscribe {
  const q = query(
    colRef('services'),
    where('status', '==', 'requested'),
    orderBy('createdAt', 'desc'),
    limit(20)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Service))
  })
}

// ─── Transactions ────────────────────────────────────────────────────────────

export async function createTransaction(data: Omit<Transaction, 'id'>): Promise<string> {
  const ref = await addDoc(colRef('transactions'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function getTransactionsByProvider(
  providerId: string,
  limitCount = 50
): Promise<Transaction[]> {
  const q = query(
    colRef('transactions'),
    where('providerId', '==', providerId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transaction)
}

// ─── Reports ────────────────────────────────────────────────────────────────

export async function createReport(data: Omit<Report, 'id'>): Promise<string> {
  const ref = await addDoc(colRef('reports'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateReport(reportId: string, data: Partial<Report>): Promise<void> {
  await updateDoc(docRef('reports', reportId), data as DocumentData)
}

export async function getPendingReports(): Promise<Report[]> {
  const q = query(
    colRef('reports'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Report)
}

// ─── Ratings ────────────────────────────────────────────────────────────────

export async function createRating(data: Omit<Rating, 'id'>): Promise<string> {
  const ref = await addDoc(colRef('ratings'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  // Update provider average
  const ratingsSnap = await getDocs(
    query(colRef('ratings'), where('toUserId', '==', data.toUserId))
  )
  const scores = ratingsSnap.docs.map((d) => (d.data() as Rating).score)
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  await updateDoc(docRef('users', data.toUserId), {
    rating: parseFloat(avg.toFixed(2)),
    totalRatings: scores.length,
  })
  return ref.id
}

// ─── Verifications ───────────────────────────────────────────────────────────

export async function setVerification(uid: string, data: Partial<Verification>): Promise<void> {
  await setDoc(docRef('verifications', uid), { ...data, uid }, { merge: true })
}

export async function getVerification(uid: string): Promise<Verification | null> {
  const snap = await getDoc(docRef('verifications', uid))
  return snap.exists() ? (snap.data() as Verification) : null
}

export async function getPendingVerifications(): Promise<Verification[]> {
  const q = query(colRef('verifications'), where('status', '==', 'pending_review'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Verification)
}

// ─── DNI Index ───────────────────────────────────────────────────────────────

export async function getDniIndex(dni: string): Promise<{ uid: string } | null> {
  const snap = await getDoc(docRef('dni_index', dni))
  return snap.exists() ? (snap.data() as { uid: string }) : null
}

export async function setDniIndex(dni: string, uid: string): Promise<void> {
  await setDoc(docRef('dni_index', dni), { uid, registeredAt: serverTimestamp() })
}

// ─── Config ──────────────────────────────────────────────────────────────────

export async function getPricingConfig(): Promise<PricingConfig | null> {
  const snap = await getDoc(docRef('config', 'pricing'))
  return snap.exists() ? (snap.data() as PricingConfig) : null
}

export async function getCommissionConfig(): Promise<CommissionConfig | null> {
  const snap = await getDoc(docRef('config', 'commission'))
  return snap.exists() ? (snap.data() as CommissionConfig) : null
}

export async function getRulesConfig(): Promise<RulesConfig | null> {
  const snap = await getDoc(docRef('config', 'rules'))
  return snap.exists() ? (snap.data() as RulesConfig) : null
}

export async function getLegalConfig(): Promise<LegalConfig | null> {
  const snap = await getDoc(docRef('config', 'legal'))
  return snap.exists() ? (snap.data() as LegalConfig) : null
}

export async function getPaymentsConfig(): Promise<PaymentsConfig | null> {
  const snap = await getDoc(docRef('config', 'payments'))
  return snap.exists() ? (snap.data() as PaymentsConfig) : null
}

export async function updateConfig(
  configKey: 'pricing' | 'commission' | 'zones' | 'rules' | 'legal' | 'payments',
  data: DocumentData
): Promise<void> {
  await setDoc(docRef('config', configKey), data, { merge: true })
}

export function subscribeToConfig<T>(
  configKey: string,
  callback: (data: T | null) => void
): Unsubscribe {
  return onSnapshot(docRef('config', configKey), (snap) => {
    callback(snap.exists() ? (snap.data() as T) : null)
  })
}

// ─── Generic query helper (admin use) ────────────────────────────────────────

export async function queryCollection<T>(
  collectionPath: string,
  constraints: QueryConstraint[]
): Promise<T[]> {
  const q = query(colRef(collectionPath), ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T)
}
