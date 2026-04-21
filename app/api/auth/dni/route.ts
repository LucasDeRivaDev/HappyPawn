import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { dni, birthDate } = await req.json()

    if (!dni || !birthDate) {
      return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 })
    }

    // Validar formato DNI
    if (!/^\d{7,8}$/.test(dni)) {
      return NextResponse.json({ error: 'DNI inválido.' }, { status: 400 })
    }

    // Buscar el uid asociado al DNI
    const dniDoc = await adminDb().collection('dni_index').doc(dni).get()
    if (!dniDoc.exists) {
      return NextResponse.json({ error: 'DNI no registrado.' }, { status: 404 })
    }

    const { uid } = dniDoc.data() as { uid: string }

    // Verificar fecha de nacimiento contra el perfil del usuario
    const userDoc = await adminDb().collection('users').doc(uid).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
    }

    const userData = userDoc.data() as { birthDate?: string; role?: string }

    if (userData.birthDate !== birthDate) {
      return NextResponse.json({ error: 'Fecha de nacimiento incorrecta.' }, { status: 401 })
    }

    // Generar custom token
    const customToken = await adminAuth().createCustomToken(uid)

    return NextResponse.json({ customToken, role: userData.role })
  } catch (err) {
    console.error('DNI login error:', err)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}
