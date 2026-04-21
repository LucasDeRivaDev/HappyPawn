import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-md w-full">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-3xl shadow-lg">
            🐾
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Paw<span className="text-primary">Go</span>
          </h1>
        </div>

        <p className="text-muted-foreground text-lg">
          Servicios para mascotas, cuando los necesitás.
        </p>

        <div className="flex flex-col gap-3 pt-4">
          <Link
            href="/login"
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-center hover:bg-primary/90 transition-colors"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register/step-1"
            className="w-full py-3 rounded-xl border border-border text-foreground font-semibold text-center hover:bg-muted transition-colors"
          >
            Crear cuenta
          </Link>
        </div>

        <p className="text-xs text-muted-foreground pt-4">
          Argentina · Santo Tomé · Santa Fe
        </p>
      </div>
    </main>
  )
}
