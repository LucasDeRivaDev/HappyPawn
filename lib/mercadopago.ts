/**
 * Lógica de MercadoPago Checkout Pro.
 * Solo se usa en el servidor (Serverless Functions / Route Handlers).
 * NUNCA importar este archivo en el cliente.
 *
 * Flujo: el pago va a la cuenta de PawGo completo.
 * Las ganancias del provider se registran en Firestore y se transfieren aparte.
 */
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import type { ServiceType } from '@/types'

const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN ?? '',
})

export interface CreatePreferenceInput {
  serviceId: string
  serviceType: ServiceType
  title: string
  finalPrice: number
  ownerId: string
  ownerEmail: string
  siteUrl: string
}

export interface PreferenceResult {
  preferenceId: string
  initPoint: string
}

export async function createPreference(
  input: CreatePreferenceInput
): Promise<PreferenceResult> {
  const preference = new Preference(mp)

  const result = await preference.create({
    body: {
      items: [
        {
          id: input.serviceId,
          title: input.title,
          quantity: 1,
          unit_price: input.finalPrice,
          currency_id: 'ARS',
        },
      ],
      payer: {
        email: input.ownerEmail,
      },
      back_urls: {
        success: `${input.siteUrl}/payment/success?serviceId=${input.serviceId}`,
        failure: `${input.siteUrl}/payment/failure?serviceId=${input.serviceId}`,
        pending: `${input.siteUrl}/payment/pending?serviceId=${input.serviceId}`,
      },
      auto_return: 'approved',
      external_reference: input.serviceId,
      notification_url: `${input.siteUrl}/api/mp-webhook`,
      metadata: {
        service_id: input.serviceId,
        service_type: input.serviceType,
        owner_id: input.ownerId,
      },
    },
  })

  if (!result.id || !result.init_point) {
    throw new Error('MercadoPago no devolvió una preferencia válida.')
  }

  return {
    preferenceId: result.id,
    initPoint: result.init_point,
  }
}

export async function getPaymentById(paymentId: string) {
  const payment = new Payment(mp)
  return payment.get({ id: paymentId })
}
