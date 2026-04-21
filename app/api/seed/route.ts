import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

// Coordenadas base Santo Tomé, Santa Fe, Argentina
const BASE_LAT = -31.6489
const BASE_LNG = -60.7658

function randomOffset(range = 0.02) {
  return (Math.random() - 0.5) * range * 2
}

export async function POST() {
  const db = adminDb()
  const auth = adminAuth()
  const results: string[] = []

  try {
    // ─── 1. Config de precios ─────────────────────────────────────────────────
    await db.collection('config').doc('pricing').set({
      walk: {
        base30min: 2500,
        base45min: 3200,
        base60min: 4000,
        providerAdjustPercent: 10,
      },
      vetTransfer: {
        baseFee: 2000,
        pricePerKm: 400,
        waitingPricePerMin: 80,
      },
      petTransport: {
        baseFee: 2500,
        pricePerKm: 500,
      },
    })
    results.push('✅ config/pricing creado')

    // ─── 2. Config de comisión ────────────────────────────────────────────────
    await db.collection('config').doc('commission').set({
      globalPercent: 5,
      byServiceType: {
        walk: 5,
        vet_transfer: 5,
        pet_transport: 5,
      },
    })
    results.push('✅ config/commission creado')

    // ─── 3. Config de reglas ──────────────────────────────────────────────────
    await db.collection('config').doc('rules').set({
      reportVetThreshold: 3,
      autoVetEnabled: true,
      maxActiveServicesPerOwner: 3,
      maxActiveServicesPerProvider: 2,
    })
    results.push('✅ config/rules creado')

    // ─── 4. Config de pagos ───────────────────────────────────────────────────
    await db.collection('config').doc('payments').set({
      cashEnabled: true,
      onlineEnabled: true,
      mpConnected: false,
    })
    results.push('✅ config/payments creado')

    // ─── 5. Config legal ──────────────────────────────────────────────────────
    await db.collection('config').doc('legal').set({
      termsVersion: '1.0',
      termsUpdatedAt: FieldValue.serverTimestamp(),
      termsContent:
        'Al usar PawGo aceptás nuestros términos de servicio. Los paseadores y conductores son trabajadores independientes. PawGo actúa como intermediario.',
      privacyVersion: '1.0',
      privacyUpdatedAt: FieldValue.serverTimestamp(),
      privacyContent:
        'Tus datos personales son tratados conforme a la Ley 25.326 de Protección de Datos Personales de Argentina.',
    })
    results.push('✅ config/legal creado')

    // ─── 6. Usuarios de prueba ────────────────────────────────────────────────
    const seedUsers = [
      {
        email: 'owner@pawgo.test',
        password: 'Test1234!',
        displayName: 'María García',
        role: 'owner',
        name: 'María',
        lastname: 'García',
        phone: '+5493425551001',
        dni: '30000001',
        isVerified: true,
        verificationStatus: 'approved',
        isSuspended: false,
        rating: 4.8,
        totalRatings: 12,
      },
      {
        email: 'walker@pawgo.test',
        password: 'Test1234!',
        displayName: 'Carlos Rodríguez',
        role: 'walker',
        name: 'Carlos',
        lastname: 'Rodríguez',
        phone: '+5493425551002',
        dni: '30000002',
        isVerified: true,
        verificationStatus: 'approved',
        isSuspended: false,
        rating: 4.9,
        totalRatings: 47,
      },
      {
        email: 'driver@pawgo.test',
        password: 'Test1234!',
        displayName: 'Ana López',
        role: 'driver',
        name: 'Ana',
        lastname: 'López',
        phone: '+5493425551003',
        dni: '30000003',
        isVerified: true,
        verificationStatus: 'approved',
        isSuspended: false,
        rating: 4.7,
        totalRatings: 23,
      },
      {
        email: 'pending@pawgo.test',
        password: 'Test1234!',
        displayName: 'Juan Pérez',
        role: 'walker',
        name: 'Juan',
        lastname: 'Pérez',
        phone: '+5493425551004',
        dni: '30000004',
        isVerified: false,
        verificationStatus: 'pending_review',
        isSuspended: false,
        rating: 0,
        totalRatings: 0,
      },
    ]

    const createdUids: Record<string, string> = {}

    for (const userData of seedUsers) {
      const { email, password, displayName, role, name, lastname, phone, dni, isVerified, verificationStatus, isSuspended, rating, totalRatings } = userData

      let uid: string

      // Intentar crear en Auth, si ya existe obtener el UID
      try {
        const authUser = await auth.createUser({ email, password, displayName })
        uid = authUser.uid
      } catch (err: unknown) {
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code: string }).code === 'auth/email-already-exists'
        ) {
          const existing = await auth.getUserByEmail(email)
          uid = existing.uid
        } else {
          throw err
        }
      }

      createdUids[email] = uid

      // Crear/actualizar doc en Firestore
      await db.collection('users').doc(uid).set({
        uid,
        name,
        lastname,
        email,
        phone,
        dni,
        role,
        isVerified,
        verificationStatus,
        isSuspended,
        rating,
        totalRatings,
        createdAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp(),
      }, { merge: true })

      // Índice DNI
      await db.collection('dni_index').doc(dni).set({ uid })

      results.push(`✅ Usuario ${email} (${role}) — uid: ${uid}`)
    }

    // ─── 7. Providers para walker y driver ───────────────────────────────────
    const walkerUid = createdUids['walker@pawgo.test']
    const driverUid = createdUids['driver@pawgo.test']

    if (walkerUid) {
      await db.collection('providers').doc(walkerUid).set({
        uid: walkerUid,
        bio: 'Paseador profesional con 3 años de experiencia. Amante de los animales, zona Santo Tomé y Santa Fe.',
        services: ['walk'],
        zones: [],
        isAvailable: true,
        currentLocation: new (await import('firebase-admin/firestore')).GeoPoint(
          BASE_LAT + randomOffset(),
          BASE_LNG + randomOffset()
        ),
        lastLocationUpdate: FieldValue.serverTimestamp(),
        totalEarnings: 85400,
        pendingCommissionDebt: 0,
        mpAccountConnected: false,
        providerAdjustPercent: 0,
      }, { merge: true })
      results.push('✅ Provider walker creado')
    }

    if (driverUid) {
      await db.collection('providers').doc(driverUid).set({
        uid: driverUid,
        bio: 'Conductora con vehículo adaptado para mascotas. Traslados a veterinarias y transporte pet-friendly.',
        services: ['vet_transfer', 'pet_transport'],
        zones: [],
        vehicleInfo: {
          brand: 'Fiat',
          model: 'Cronos',
          year: 2022,
          color: 'Blanco',
          plate: 'AB123CD',
          hasProtector: true,
          photos: [],
          acceptedPetTypes: ['dog', 'cat'],
          acceptedSizes: ['small', 'medium', 'large'],
        },
        isAvailable: true,
        currentLocation: new (await import('firebase-admin/firestore')).GeoPoint(
          BASE_LAT + randomOffset(),
          BASE_LNG + randomOffset()
        ),
        lastLocationUpdate: FieldValue.serverTimestamp(),
        totalEarnings: 42000,
        pendingCommissionDebt: 0,
        mpAccountConnected: false,
        providerAdjustPercent: 5,
      }, { merge: true })
      results.push('✅ Provider driver creado')
    }

    // ─── 8. Mascotas del owner ────────────────────────────────────────────────
    const ownerUid = createdUids['owner@pawgo.test']

    if (ownerUid) {
      const petsData = [
        {
          ownerId: ownerUid,
          name: 'Luna',
          breed: 'Labrador',
          age: 3,
          weight: 25,
          size: 'large',
          photos: [],
          medicalNotes: 'Al día con vacunas',
          vaccinations: ['rabia', 'sextuple'],
        },
        {
          ownerId: ownerUid,
          name: 'Milo',
          breed: 'Beagle',
          age: 2,
          weight: 10,
          size: 'medium',
          photos: [],
          medicalNotes: '',
          vaccinations: ['rabia', 'sextuple'],
        },
      ]

      for (const pet of petsData) {
        const petRef = db.collection('pets').doc()
        await petRef.set({ id: petRef.id, ...pet })
        results.push(`✅ Mascota ${pet.name} creada (owner: ${ownerUid})`)
      }
    }

    // ─── 9. Verificación pendiente para Juan Pérez ────────────────────────────
    const pendingUid = createdUids['pending@pawgo.test']
    if (pendingUid) {
      await db.collection('verifications').doc(pendingUid).set({
        uid: pendingUid,
        dniPhotoFront: '',
        dniPhotoBack: '',
        selfiePhoto: '',
        selfieTimestamp: FieldValue.serverTimestamp(),
        submittedAt: FieldValue.serverTimestamp(),
        status: 'pending_review',
      }, { merge: true })
      results.push('✅ Verificación pendiente creada (para probar panel admin)')
    }

    return NextResponse.json({
      ok: true,
      message: 'Seed completado',
      results,
      usuarios: {
        owner: 'owner@pawgo.test / Test1234!',
        walker: 'walker@pawgo.test / Test1234!',
        driver: 'driver@pawgo.test / Test1234!',
        pending: 'pending@pawgo.test / Test1234! (verificación pendiente)',
      },
      siguiente: 'Creá tu propia cuenta, andá a Firestore → users/{tu-uid} y cambiá role a "admin"',
    })
  } catch (error) {
    console.error('[SEED ERROR]', error)
    return NextResponse.json(
      {
        ok: false,
        error: String(error),
        completedSoFar: results,
      },
      { status: 500 }
    )
  }
}
