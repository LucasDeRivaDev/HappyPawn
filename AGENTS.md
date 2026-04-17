<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Reglas del proyecto PawGo

## Antes de escribir cualquier código
1. Leer `STATUS.md` para entender qué está hecho y qué falta.
2. Verificar TypeScript antes de reportar una tarea como terminada: `npx tsc --noEmit`
3. Verificar que el build pasa: `npm run build`

## Arquitectura — reglas estrictas
- **Firestore**: NUNCA acceder directamente desde componentes. Siempre usar las funciones de `lib/firestore.ts`.
- **Precios y comisiones**: NUNCA hardcodear valores. Siempre usar las funciones de `lib/pricing.ts`.
- **Firebase client**: NUNCA importar desde `lib/firebase.ts` en archivos de servidor (route handlers, server components). Usar `lib/firebase-admin.ts`.
- **Leaflet / MapView**: SIEMPRE importar con `dynamic(() => import('./MapView'), { ssr: false })`. Nunca import directo.
- **Route groups**: `(auth)`, `(owner)`, `(provider)` son solo organizativos. NO forman parte de la URL. `/login` no `/(auth)/login`.

## Stack — versiones que NO se pueden cambiar
- **react-leaflet v5** — no bajar a v4, es incompatible con React 19
- **Next.js 16** con `export const dynamic = 'force-dynamic'` en `app/layout.tsx` — no eliminar, evita que Firebase crashee en build
- **Tailwind v4** — sintaxis diferente a v3

## MercadoPago
- La preferencia se crea con el token del **PROVEEDOR**, no de la plataforma.
- La plataforma recibe su comisión vía `marketplace_fee`.
- Nunca exponer tokens de MP en el cliente.

## Seguridad
- `dni_index` en Firestore: solo lectura desde servidor (Admin SDK). Las reglas bloquean el cliente.
- Tokens de MercadoPago de proveedores: se guardan en `providers/{uid}.mpAccessToken`, nunca en el cliente.
- Variables sin prefijo `NEXT_PUBLIC_` son solo del servidor.

## Al terminar cada tarea
- Actualizar la sección correspondiente en `STATUS.md` (marcar como completado).
- Correr `npx tsc --noEmit` para verificar que no hay errores de TypeScript.

