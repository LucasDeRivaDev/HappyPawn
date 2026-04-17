import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { createPreference } from '@/lib/mercadopago'
import { calculateCommission, DEFAULT_COMMISSION_CONFIG } from '@/lib/pricing'
import type { Service, User, CommissionConfig } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { serviceId } = await req.json()

    if (!serviceId) {
      return NextResponse.json({ error: 'serviceId requerido' }, { status: 400 })
    }

    const db = adminDb()

    // 1. Obtener el servicio
    const serviceSnap = await db.collection('services').doc(serviceId).get()
    if (!serviceSnap.exists) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })
    }
    const service = serviceSnap.data() as Service

    if (service.paymentMethod !== 'online') {
      return NextResponse.json({ error: 'Este servicio es en efectivo' }, { status: 400 })
    }
    if (service.mpPreferenceId) {
      return NextResponse.json({ error: 'Ya tiene preferencia creada' }, { status: 400 })
    }

    // 2. Obtener el owner
    const ownerSnap = await db.collection('users').doc(service.ownerId).get()
    const owner = ownerSnap.data() as User

    // 3. Calcular comisión para registrar en Firestore
    const commissionSnap = await db.collection('config').doc('commission').get()
    const commissionConfig: CommissionConfig = commissionSnap.exists
      ? (commissionSnap.data() as CommissionConfig)
      : DEFAULT_COMMISSION_CONFIG

    const { commissionAmount } = calculateCommission(
      service.finalPrice,
      service.serviceType,
      commissionConfig
    )

    // 4. Crear preferencia en MercadoPago (pago va a cuenta de PawGo)
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const serviceLabels: Record<string, string> = {
      walk: 'Paseo',
      vet_transfer: 'Traslado veterinario',
      pet_transport: 'Transporte',
    }

    const result = await createPreference({
      serviceId,
      serviceType: service.serviceType,
      title: `PawGo — ${serviceLabels[service.serviceType] ?? service.serviceType}`,
      finalPrice: service.finalPrice,
      ownerId: service.ownerId,
      ownerEmail: owner.email,
      siteUrl,
    })

    // 5. Guardar preferenceId y comisión en el servicio
    await db.collection('services').doc(serviceId).update({
      mpPreferenceId: result.preferenceId,
      commissionAmount,
      debtCancelledAmount: 0,
    })

    return NextResponse.json({
      preferenceId: result.preferenceId,
      initPoint: result.initPoint,
    })
  } catch (err: any) {
    console.error('[create-preference]', err)
    return NextResponse.json({ error: err.message ?? 'Error interno' }, { status: 500 })
  }
}
