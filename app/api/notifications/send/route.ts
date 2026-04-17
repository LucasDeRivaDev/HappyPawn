import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminMessaging } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { toUid, title, body, data } = await req.json()

    if (!toUid || !title) {
      return NextResponse.json({ error: 'toUid y title son requeridos' }, { status: 400 })
    }

    // Leer el fcmToken del usuario
    const userSnap = await adminDb().collection('users').doc(toUid).get()
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const fcmToken = userSnap.data()?.fcmToken
    if (!fcmToken) {
      // El usuario no habilitó notificaciones — no es un error
      return NextResponse.json({ ok: true, skipped: true })
    }

    await adminMessaging().send({
      token: fcmToken,
      notification: { title, body: body ?? '' },
      data: data ?? {},
      webpush: {
        notification: {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
        },
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[notifications/send]', err)
    return NextResponse.json({ error: err.message ?? 'Error interno' }, { status: 500 })
  }
}
