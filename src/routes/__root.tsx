import { createRootRoute, Outlet } from "@tanstack/react-router"
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/core/contexts/language-context";
import { QrScanButton } from "@/components/qr-scan/qr-scan-button";
import { AuthProvider, useAuth } from "@/core/contexts/auth-context";

function RootLayout() {
  const { isAuthenticated } = useAuth();

  return (
    <LanguageProvider availableLanguages={['en', 'th']}>
      <Outlet />
      <Toaster position="top-right" richColors />

      {isAuthenticated && <QrScanButton />}
    </LanguageProvider>
  );
}

export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <RootLayout />
    </AuthProvider>
  ),
});