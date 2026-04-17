import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // uid del provider

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (!code || !state) {
    return NextResponse.redirect(`${siteUrl}/provider-profile?mpError=missing_params`)
  }

  try {
    // Intercambiar el code por el access_token del provider
    const tokenRes = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.MP_CLIENT_ID,
        client_secret: process.env.MP_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${siteUrl}/api/mp/callback`,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('[mp/callback] token error:', err)
      return NextResponse.redirect(`${siteUrl}/provider-profile?mpError=token_failed`)
    }

    const tokenData = await tokenRes.json()
    const accessToken: string = tokenData.access_token

    if (!accessToken) {
      return NextResponse.redirect(`${siteUrl}/provider-profile?mpError=no_token`)
    }

    // Guardar el token en Firestore (solo accesible desde el servidor)
    const db = adminDb()
    await db.collection('providers').doc(state).update({
      mpAccessToken: accessToken,
      mpAccountConnected: true,
    })

    return NextResponse.redirect(`${siteUrl}/provider-profile?mpConnected=true`)
  } catch (err: any) {
    console.error('[mp/callback]', err)
    return NextResponse.redirect(`${siteUrl}/provider-profile?mpError=server_error`)
  }
}
