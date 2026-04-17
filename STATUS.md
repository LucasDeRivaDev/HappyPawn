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

## Stack tecnológico

### Usado
- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4** + **shadcn/ui** (componentes UI)
- **Firebase** (Auth, Firestore, Storage) — proyecto: `paseospatitasfelices`
- **Zustand** (estado global: auth + service stores)
- **React Hook Form + Zod** (formularios con validación)
- **react-leaflet v5** + **OpenStreetMap** (mapa en tiempo real)
- **Nominatim** (geocoding gratuito, sin API key)
- **Sonner** (notificaciones toast)
- **MercadoPago SDK** (instalado, parcialmente integrado)

### Por integrar
- **Firebase Cloud Messaging (FCM)** — notificaciones push
- **MercadoPago Marketplace** — split automático 95/5 con OAuth del provider
- **Framer Motion** — animaciones de pantalla

---

## Variables de entorno (.env.local)
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDl1K1qNp_Qh4fD0g8Cidy1v8dvGZB7QoM
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=paseospatitasfelices.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=paseospatitasfelices
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=paseospatitasfelices.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=(pendiente)
NEXT_PUBLIC_FIREBASE_APP_ID=(pendiente)
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@paseospatitasfelices.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
MP_MARKETPLACE_ACCESS_TOKEN=(pendiente — token de la PLATAFORMA PawGo)
MP_CLIENT_ID=(pendiente)
MP_CLIENT_SECRET=(pendiente)
MP_WEBHOOK_SECRET=(pendiente)
NEXT_PUBLIC_APP_URL=http://localhost:3000
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
/payment/success         → Pago exitoso
/payment/failure         → Pago fallido
/payment/pending         → Pago en proceso
/api/auth/dni            → API: login con DNI (Admin SDK)
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

---

## ✅ Completado

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

---

## ❌ Pendiente (en orden de prioridad)

### 1. MercadoPago Checkout Pro ✅ COMPLETADO
Todo el código está implementado. Falta cargar las credenciales reales en `.env.local`:

- [x] `app/api/payment/create-preference/route.ts` ✅
- [x] `app/api/mp-webhook/route.ts` ✅
- [x] `app/(provider)/connect-mp/page.tsx` ✅
- [x] `app/api/mp/callback/route.ts` ✅
- [x] `app/(owner)/tracking/page.tsx` — redirige a MP al completar con pago online ✅
- [x] `app/(provider)/provider-profile/page.tsx` — muestra estado de conexión MP ✅

**Para activar, cargar en `.env.local` y en Vercel:**
```
MP_MARKETPLACE_ACCESS_TOKEN=APP_USR-...   ← token de la PLATAFORMA PawGo
MP_CLIENT_ID=...                          ← ID de la app MP Marketplace
MP_CLIENT_SECRET=...                      ← secret de la app MP Marketplace
NEXT_PUBLIC_MP_CLIENT_ID=...              ← mismo client_id (para el frontend)
NEXT_PUBLIC_APP_URL=https://pawgo.vercel.app
```

**Pasos para obtener credenciales:**
1. Entrar a developers.mercadopago.com.ar
2. Crear una app con tipo "Marketplace"
3. Copiar Client ID, Client Secret y Access Token
4. En "Redirect URI" agregar: `https://pawgo.vercel.app/api/mp/callback`

---

### 2. PWA Icons — PRIORIDAD BAJA
- [ ] Crear `public/icon-192.png` y `public/icon-512.png` (logo HappyPaw: pata naranja)
- [ ] Actualizar `public/manifest.json` con los paths

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

# Deployar reglas de Firestore
firebase deploy --only firestore:rules --project paseospatitasfelices

# Build de producción
npm run build

# Deploy en Vercel
vercel --prod
```

---

## Datos del proyecto
- **Nombre**: PawGo
- **Developer**: Lucas Cabrera (LucasDeRivaDev)
- **Firebase project ID**: `paseospatitasfelices`
- **Carpeta local**: `C:/Proyectos con IA/paseospatitasfelices/pawgo`

---

*Última actualización: 17 de abril 2026 — sesión 2*
