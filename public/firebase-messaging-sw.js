// Service Worker para Firebase Cloud Messaging
// Recibe notificaciones cuando la app está cerrada o en background

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyDl1K1qNp_Qh4fD0g8Cidy1v8dvGZB7QoM',
  authDomain: 'paseospatitasfelices.firebaseapp.com',
  projectId: 'paseospatitasfelices',
  storageBucket: 'paseospatitasfelices.firebasestorage.app',
  messagingSenderId: '959361229414',
  appId: '1:959361229414:web:f839d6b50f88e130a303a7',
})

const messaging = firebase.messaging()

// Mostrar notificación cuando la app está en background
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {}
  if (!title) return

  self.registration.showNotification(title, {
    body: body ?? '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data,
  })
})
