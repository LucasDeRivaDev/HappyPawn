# PawGo — Estado del proyecto

## ¿Qué es PawGo?
Marketplace de servicios para mascotas en Argentina (Santo Tomé, Santa Fe).
Similar a Uber pero para mascotas: conecta dueños con paseadores y conductores.
3 servicios: paseo de perros, traslado al veterinario, transporte pet-friendly.
4 roles: owner (dueño), walker (paseador), driver (conductor), admin.

---

## Cómo continuar en una nueva sesión
Decile a Claude: **"Leé el archivo STATUS.md en `C:/Proyectos con IA/paseospatitasfelices/pawgo/STATUS.md` y continuá desde donde quedó el proyecto"**

---

## Deploy

- **URL producción**: https://pawgo-theta.vercel.app ✅ ACTIVO
- **Última vez deployado**: 18 de abril 2026 — funcionando correctamente
- **Comando para deployar**:
  ```bash
  cd "C:/Proyectos con IA/paseospatitasfelices/pawgo"
  vercel --prod --scope luca-de-rivias-projects
  ```

---

## Stack tecnológico

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4** + **shadcn/ui** (componentes UI)
- **Firebase** (Auth, Firestore, Storage) — proyecto: `paseospatitasfelices`
- **Zustand** (estado global: auth + service stores)
- **React Hook Form + Zod** (formularios con validación)
- **react-leaflet v5** + **OpenStreetMap** (mapa en tiempo real)
- **Nominatim** (geocoding gratuito, sin API key)
- **Sonner** (notificaciones toast)
- **MercadoPago Checkout Pro** (pago a cuenta de PawGo)
- **Firebase Cloud Messaging (FCM)** (notificaciones push)
- **Framer Motion** (animaciones)

---

## Variables de entorno

### .env.local (desarrollo local)
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDl1K1qNp_Qh4fD0g8Cidy1v8dvGZB7QoM
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=paseospatitasfelices.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=paseospatitasfelices
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=paseospatitasfelices.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=959361229414
NEXT_PUBLIC_FIREBASE_APP_ID=1:959361229414:web:f839d6b50f88e130a303a7
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@paseospatitasfelices.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
MP_ACCESS_TOKEN=APP_USR-8641337946987313-041717-...   ← token de prueba
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BAwSjl76dv03D4Eqm_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=pawgo_cron_dev_2026
```

### Vercel (producción) — todas cargadas ✅
| Variable | Estado |
|---|---|
| NEXT_PUBLIC_FIREBASE_* (6 vars) | ✅ |
| FIREBASE_ADMIN_CLIENT_EMAIL | ✅ |
| FIREBASE_ADMIN_PRIVATE_KEY | ✅ cargada 18/04/2026 |
| MP_ACCESS_TOKEN | ✅ token de prueba |
| NEXT_PUBLIC_FIREBASE_VAPID_KEY | ✅ |
| NEXT_PUBLIC_APP_URL | ✅ https://pawgo-theta.vercel.app |
| CRON_SECRET | ✅ |

⚠️ Para cargar FIREBASE_ADMIN_PRIVATE_KEY en Vercel siempre usar stdin (no --value):
```bash
cat .env.local | grep FIREBASE_ADMIN_PRIVATE_KEY | sed 's/FIREBASE_ADMIN_PRIVATE_KEY=//' | tr -d '"' | vercel env add FIREBASE_ADMIN_PRIVATE_KEY production --yes
```

---

## Estructura de rutas (todas funcionando)

```
/                        → Landing page
/login                   → Login (email, Google, DNI)
/register/step-1         → Datos personales
/register/step-2         → Fotos DNI + selfie
/register/step-3         → Checkboxes legales
/register/step-4         → Elección de rol
/verify                  → Pantalla de espera de verificación
/home                    → Mapa principal del owner
/request/[type]          → Solicitar servicio (walk/vet_transfer/pet_transport)
/tracking                → Seguimiento en tiempo real del servicio
/history                 → Historial de servicios del owner
/pets                    → Gestión de mascotas (CRUD)
/profile                 → Perfil del owner
/dashboard               → Dashboard del provider/driver (toggle disponibilidad + mapa)
/active-service          → Servicio activo para provider/driver
/earnings                → Ganancias del provider/driver
/provider-profile        → Perfil del provider/driver
/reports                 → Formulario de reporte para provider
/admin                   → Panel de administración (5 tabs)
/suspended               → Pantalla para cuentas suspendidas
/payment/success         → Pago exitoso
/payment/failure         → Pago fallido
/payment/pending         → Pago en proceso
/connect-mp              → Conexión MercadoPago del provider (OAuth)
/api/auth/dni            → API: login con DNI (Admin SDK)
/api/payment/create-preference → Crea preferencia MP
/api/mp-webhook          → Webhook de pagos MP
/api/mp/callback         → Callback OAuth MP
/api/notifications/send  → Envía push FCM
```

---

## Archivos clave

```
lib/
  firebase.ts            ← Firebase client init (condicional, no crashea en build)
  firebase-admin.ts      ← Firebase Admin SDK (solo servidor)
  firestore.ts           ← TODAS las operaciones de Firestore centralizadas acá
  pricing.ts             ← TODA la lógica de precios y comisiones
  geolocation.ts         ← GPS, geocoding Nominatim, distancia Haversine
  mercadopago.ts         ← createMarketplacePreference, getPaymentById

types/index.ts           ← Todos los tipos TypeScript

store/
  auth.ts                ← Zustand: user, provider, loading
  service.ts             ← Zustand: activeService, userLocation, availableProviders

components/
  auth/AuthProvider.tsx           ← onAuthStateChanged, carga user+provider
  auth/VerificationBanner.tsx     ← banner amarillo/rojo verificación
  map/MapView.tsx                 ← Leaflet map (siempre con ssr:false)
  map/MapViewDynamic.tsx          ← dynamic import wrapper
  services/NearbyRequestCard.tsx  ← tarjeta de solicitud para provider
  services/ProviderBottomSheet.tsx← bottom sheet al tocar proveedor en mapa
  payments/DebtBanner.tsx         ← banner naranja de deuda pendiente
  layout/BottomNav.tsx            ← nav inferior (diferente owner vs provider)
```

---

## Notas importantes para no romper nada

1. **Route groups**: `(auth)`, `(owner)`, `(provider)` son solo organizativos, NO aparecen en la URL. `/login` no `/(auth)/login`.
2. **Firebase no crashea en build**: `lib/firebase.ts` tiene guard `hasConfig`. El `app/layout.tsx` tiene `export const dynamic = 'force-dynamic'`.
3. **react-leaflet v5** (no v4 — incompatible con React 19). Siempre con `dynamic(() => import('./MapView'), { ssr: false })`.
4. **MercadoPago split**: La preferencia se crea con el token del PROVEEDOR (no de la plataforma). La plataforma recibe su parte vía `marketplace_fee`.
5. **dni_index**: Solo se lee desde el servidor (Admin SDK). Las reglas de Firestore bloquean la lectura desde el cliente.
6. **Drivers y walkers** usan las mismas páginas. No hay grupo `(driver)` — fue eliminado por conflicto de rutas.
7. **FIREBASE_ADMIN_PRIVATE_KEY en Vercel**: siempre cargar por stdin, nunca con --value (los saltos de línea rompen el CLI).

---

## ✅ Todo completado

### Autenticación
- [x] Registro 4 pasos completo
- [x] Login con email/contraseña, Google OAuth, DNI + fecha de nacimiento
- [x] Verificación de identidad con fotos DNI y selfie en tiempo real
- [x] Flujo verificación pendiente / aprobada / rechazada
- [x] Guards de autenticación y redirección por rol

### Owner
- [x] Mapa en tiempo real con proveedores disponibles
- [x] Solicitar servicio (paseo, veterinaria, transporte) con selección de mascotas, duración y método de pago
- [x] Tracking en tiempo real del proveedor en el mapa
- [x] Estados: requested → accepted → provider_on_way → in_progress → completed
- [x] Calificación post-servicio (1-5 estrellas + comentario)
- [x] Cancelación de solicitud
- [x] Historial de servicios
- [x] CRUD completo de mascotas
- [x] Perfil con edición y formulario de reporte

### Provider / Driver
- [x] Toggle de disponibilidad + GPS automático cada 5 segundos
- [x] Lista de solicitudes cercanas en tiempo real
- [x] Flujo completo: Aceptar → En camino → Iniciar → Completar
- [x] Registro automático de deuda de comisión en pagos efectivo
- [x] Historial de ganancias con desglose de comisiones
- [x] Perfil con bio y estadísticas
- [x] Banners de deuda y verificación pendiente
- [x] Formulario de reporte de problemas con clientes

### Admin
- [x] Verificaciones: ver fotos DNI + selfie, aprobar o rechazar con nota
- [x] Reportes: confirmar o desestimar
- [x] Usuarios: lista con rol y estado
- [x] Servicios: lista con estado y precio
- [x] Config: editar precios de paseos y porcentaje de comisión

### Infraestructura
- [x] Todas las colecciones Firestore creadas
- [x] Reglas de seguridad Firestore deployadas
- [x] Firebase Storage para fotos de verificación
- [x] Audit log automático en cambios de estado
- [x] Precios configurables desde Firestore con fallback local
- [x] Sistema de ratings con promedio automático
- [x] Deploy en Vercel con todas las variables de entorno ✅

### Pagos
- [x] MercadoPago Checkout Pro integrado (pago va a cuenta de PawGo)
- [x] Webhook `/api/mp-webhook` confirma pagos y actualiza Firestore
- [x] Tracking redirige al checkout de MP al completar con pago online
- [x] Páginas de resultado: /payment/success, /failure, /pending

### Notificaciones Push (FCM)
- [x] Service worker `firebase-messaging-sw.js` para notificaciones en background
- [x] Hook `usePushNotifications` pide permiso y guarda fcmToken en Firestore
- [x] API `/api/notifications/send` para enviar notificaciones a cualquier usuario
- [x] Notificación al owner cuando el provider acepta el servicio

### UI / UX
- [x] Dark mode toggle en perfil owner y provider
- [x] Animaciones Framer Motion: transiciones de página, slide-up bottom sheet, fade-in cards
- [x] Suspender/reactivar usuarios desde el panel admin
- [x] Pantalla `/suspended` para cuentas bloqueadas con redirección automática

### Features extra
- [x] Ajuste de precio ±10% por provider (slider en perfil, visible en bottom sheet y solicitud)
- [x] Chat interno owner ↔ provider durante el servicio con filtro anti-contacto externo
- [x] Cola de próximo paseo: cuando quedan ≤15 min aparecen solicitudes cercanas para aceptar
- [x] Cuenta regresiva en tiempo real en la pantalla de servicio activo
- [x] Al completar servicio con próximo en cola → redirige directo al siguiente

### Correcciones sesión 20/04/2026
- [x] Bug Turbopack: `firebase/messaging` movido a dynamic import (rompía el login)
- [x] Bug auth: todas las páginas protegidas esperan `authLoading` antes de redirigir (refresh mandaba al login)
- [x] Bug z-index: mapa Leaflet tapaba el BottomNav y header (fix con `isolation: isolate`)
- [x] Bug `startedAt`/`finishedAt`: ahora guardan `serverTimestamp()` real (antes guardaban `null`)
- [x] Firebase Storage rules creadas y deployadas (bloqueaban el registro)
- [x] Precio transporte pet-friendly: campo destino con geocoding real y precio por km
- [x] Seed de datos cargado en producción ✅
- [x] Rol admin seteado en Firestore ✅

---

## ❌ Pendiente (en orden de prioridad)

### 1. Reservas anticipadas — PRÓXIMA FEATURE GRANDE
Cliente elige paseador específico + fecha (1-2 días adelante) + horario fijo.
Reglas acordadas:
- Pago obligatorio por MP (no efectivo): seña del 20% al reservar
- Cliente cancela < 12hs: 5% a PawGo, 15% al paseador (pierde la seña)
- Cliente cancela ≥ 12hs: devolución completa
- Paseador cancela < 12hs: devolución completa al cliente + notificación + el cliente puede calificarlo
- Las reservas aparecen en el perfil del paseador como pestaña "Reservas"
- Los turnos reservados aparecen en el perfil del owner también

Cambios técnicos necesarios:
- Nuevo status `scheduled` en tipos + campos: `scheduledAt`, `depositAmount`, `depositPaid`, `isScheduled`
- API `/api/bookings/cancel` con lógica de reembolso parcial/total
- UI owner: fecha/hora picker + pago de seña via MP
- UI provider: pestaña "Reservas" en perfil

### 2. MercadoPago Marketplace — 🚫 NO TOCAR POR AHORA
> Lucas decidió dejarlo para mucho más adelante. No retomar este tema hasta que lo pida explícitamente.
> Cuando llegue el momento: split automático owner→provider via OAuth + marketplace_fee.

### 3. Afinar layout del mapa en /home — PRIORIDAD BAJA
- El mapa y el BottomNav funcionan pero los tamaños necesitan ajuste visual

### 4. PWA Icons — PRIORIDAD BAJA
- [ ] Crear `public/icon-192.png` y `public/icon-512.png` (logo PawGo: pata)
- [ ] Actualizar `public/manifest.json` con los paths

### 5. README profesional del repo — para portfolio
- Descripción del proyecto, tech stack, screenshots, link al deploy

---

## Colecciones en Firestore

| Colección | Descripción |
|-----------|-------------|
| `users/{uid}` | Datos del usuario (todos los roles) |
| `providers/{uid}` | Datos del paseador/conductor |
| `pets/{petId}` | Mascotas del owner |
| `services/{serviceId}` | Servicios solicitados |
| `services/{id}/audit_log` | Log de cambios de estado |
| `verifications/{uid}` | Fotos de DNI y selfie |
| `reports/{reportId}` | Reportes de problemas |
| `ratings/{ratingId}` | Calificaciones post-servicio |
| `transactions/{transactionId}` | Transacciones de pago |
| `dni_index/{dni}` | Índice DNI → uid (solo Admin SDK) |
| `config/pricing` | Precios de servicios |
| `config/commission` | Porcentaje de comisión |
| `config/rules` | Reglas de negocio |
| `config/legal` | Términos y condiciones |
| `config/payments` | Configuración de pagos |

---

## Comandos útiles

```bash
# Levantar en local
cd "C:/Proyectos con IA/paseospatitasfelices/pawgo"
npm run dev

# Verificar TypeScript sin errores
npx tsc --noEmit

# Build de producción
npm run build

# Deploy en Vercel
vercel --prod --scope luca-de-rivias-projects

# Deployar reglas de Firestore
firebase deploy --only firestore:rules --project paseospatitasfelices

# Cargar FIREBASE_ADMIN_PRIVATE_KEY en Vercel (siempre así, con stdin)
cat .env.local | grep FIREBASE_ADMIN_PRIVATE_KEY | sed 's/FIREBASE_ADMIN_PRIVATE_KEY=//' | tr -d '"' | vercel env add FIREBASE_ADMIN_PRIVATE_KEY production --yes
```

---

## Datos del proyecto
- **Nombre**: PawGo
- **Developer**: Lucas Cabrera (LucasDeRivaDev)
- **Firebase project ID**: `paseospatitasfelices`
- **Carpeta local**: `C:/Proyectos con IA/paseospatitasfelices/pawgo`
- **Repo GitHub**: github.com/LucasDeRivaDev/paseospatitasfelices
- **URL producción**: https://pawgo-theta.vercel.app

## Git
```bash
# Para hacer commit y push
cd "C:/Proyectos con IA/paseospatitasfelices/pawgo"
git add .
git commit -m "mensaje"
git push origin master
```

---

*Última actualización: 20 de abril 2026 — sesión 4*
