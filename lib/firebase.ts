import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  type Auth,
} from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Solo inicializar si las variables de entorno están configuradas
const hasConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
)

let app: FirebaseApp | null = null
let auth: Auth
let db: Firestore
let storage: FirebaseStorage

if (hasConfig) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig as any)
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
} else if (typeof window !== 'undefined') {
  console.warn(
    '⚠️ PawGo: Variables de Firebase no configuradas. Completá el .env.local para usar la app.'
  )
}

// @ts-ignore — en desarrollo sin config, las llamadas fallarán con mensaje claro
export { auth, db, storage }
export default app

export const getMessagingInstance = async () => {
  if (typeof window === 'undefined' || !app) return null
  const { getMessaging, isSupported } = await import('firebase/messaging')
  const supported = await isSupported()
  if (!supported) return null
  return getMessaging(app)
}
