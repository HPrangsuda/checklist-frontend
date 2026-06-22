import { createRootRoute, Outlet } from "@tanstack/react-router"
import { Toaster } from "@/components/ui/sonner"
import { LanguageProvider } from "@/core/contexts/language-context"
import { QrScanButton } from "@/components/qr-scan/qr-scan-button"
import { AuthProvider, useAuth } from "@/core/contexts/auth-context"
import { QrScanProvider, useQrScan } from "@/core/contexts/qr-scan-context"

function RootLayout() {
  const { isAuthenticated } = useAuth()
  const { hideQrButton } = useQrScan()

  return (
    <LanguageProvider availableLanguages={['en', 'th']}>
      <Outlet />
      <Toaster position="top-right" richColors />
      {isAuthenticated && <QrScanButton hidden={hideQrButton} />}
    </LanguageProvider>
  )
}

export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <QrScanProvider>
        <RootLayout />
      </QrScanProvider>
    </AuthProvider>
  ),
})