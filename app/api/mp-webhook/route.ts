import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getPaymentById } from '@/lib/mercadopago'
import { FieldValue } from 'firebase-admin/firestore'
import type { Service, Provider } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // MP envía distintos tipos de notificación
    // Solo nos interesan las de tipo "payment"
    if (body.type !== 'payment') {
      return NextResponse.json({ ok: true })
    }

    const paymentId = String(body.data?.id)
    if (!paymentId) {
      return NextResponse.json({ error: 'Sin payment id' }, { status: 400 })
    }

    // Obtener el pago de MP
    const payment = await getPaymentById(paymentId)

    if (payment.status !== 'approved') {
      return NextResponse.json({ ok: true })
    }

    const serviceId = payment.external_reference
    if (!serviceId) {
      return NextResponse.json({ error: 'Sin external_reference' }, { status: 400 })
    }

    const db = adminDb()

    // Verificar que el servicio existe y no fue procesado ya
    const serviceSnap = await db.collection('services').doc(serviceId).get()
    if (!serviceSnap.exists) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })
    }
    const service = serviceSnap.data() as Service

    if (service.mpSplitExecuted) {
      // Idempotencia: ya fue procesado, ignorar
      return NextResponse.json({ ok: true })
    }

    if (!service.providerId) {
      return NextResponse.json({ error: 'Sin providerId' }, { status: 400 })
    }

    // El pago llega completo a PawGo.
    // Registramos cuánto le corresponde al provider (para transferirle después).
    const toPlatform = service.commissionAmount
    const debtCancelled = service.debtCancelledAmount ?? 0
    const toProvider = service.finalPrice - toPlatform

    const batch = db.batch()

    // 1. Actualizar el servicio: pago aprobado, split ejecutado
    batch.update(db.collection('services').doc(serviceId), {
      paymentStatus: 'paid',
      mpSplitExecuted: true,
      mpPaymentId: paymentId,
    })

    // 2. Crear la transacción
    const transactionRef = db.collection('transactions').doc()
    batch.set(transactionRef, {
      serviceId,
      serviceType: service.serviceType,
      ownerId: service.ownerId,
      providerId: service.providerId,
      petId: service.petIds?.[0] ?? '',
      startedAt: service.startedAt ?? null,
      finishedAt: service.finishedAt ?? null,
      durationMinutes: service.durationMinutes ?? 0,
      distanceKm: service.distanceKm ?? 0,
      basePrice: service.basePrice,
      finalPrice: service.finalPrice,
      commissionPercent: service.commissionPercent,
      commissionAmount: toPlatform,
      commissionDeducted: true,
      debtCancelledAmount: debtCancelled,
      paymentMethod: 'online',
      paymentStatus: 'paid',
      mpPreferenceId: service.mpPreferenceId ?? '',
      mpSplitExecuted: true,
      route: service.route ?? [],
      rating: service.rating ?? null,
      review: service.review ?? null,
      acceptedAt: service.acceptedAt ?? null,
      createdAt: FieldValue.serverTimestamp(),
    })

    // 3. Actualizar ganancias del provider
    batch.update(db.collection('providers').doc(service.providerId), {
      totalEarnings: FieldValue.increment(toProvider),
      // Si había deuda de efectivo, descontarla
      pendingCommissionDebt: FieldValue.increment(-debtCancelled),
    })

    await batch.commit()

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[mp-webhook]', err)
    return NextResponse.json({ error: err.message ?? 'Error interno' }, { status: 500 })
  }
}
