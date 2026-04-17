'use client'

import { usePathname } from 'next/navigation'
import { ThemeProvider } from 'next-themes'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/components/auth/AuthProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ minHeight: '100dvh' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
        <Toaster position="top-center" richColors closeButton />
      </AuthProvider>
    </ThemeProvider>
  )
}
