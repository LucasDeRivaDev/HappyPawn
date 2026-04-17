'use client'

import { useEffect } from 'react'
import { getToken } from 'firebase/messaging'
import { getMessagingInstance } from '@/lib/firebase'
import { updateUser } from '@/lib/firestore'
import { useAuthStore } from '@/store/auth'

export function usePushNotifications() {
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!user) return
    requestAndSaveToken(user.uid)
  }, [user?.uid])
}

async function requestAndSaveToken(uid: string) {
  try {
    const messaging = await getMessagingInstance()
    if (!messaging) return

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js'
      ),
    })

    if (token) {
      await updateUser(uid, { fcmToken: token } as any)
    }
  } catch (err) {
    // Silencioso — las notificaciones son opcionales
    console.warn('[FCM] No se pudo obtener el token:', err)
  }
}
