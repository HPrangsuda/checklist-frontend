import { createRootRoute, Outlet } from "@tanstack/react-router"
import { Toaster } from "@/components/ui/sonner"
import { LanguageProvider } from "@/core/contexts/language-context"
import { QrScanButton } from "@/components/qr-scan/qr-scan-button"
import { AuthProvider, useAuth } from "@/core/contexts/auth-context"
import { QrScanProvider, useQrScan } from "@/core/contexts/qr-scan-context"
import { X, Megaphone } from "lucide-react"
import announcementPdf from '@/assets/file/meeting_11-06-2026.pdf'

function AnnouncementPopup() {
  const { showAnnouncement, setShowAnnouncement } = useQrScan()

  if (!showAnnouncement) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl border border-border w-[95%] lg:w-[60%] max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-neutral-700 shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Megaphone className="w-5 h-5" />
            <span className="font-medium text-sm">ประกาศ — สรุปการประชุม การจัดการเครื่องจักรและอุปกรณ์</span>
          </div>
          <button onClick={() => setShowAnnouncement(false)} className="text-white/70 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meta */}
        <div className="px-5 py-3 bg-neutral-50 border-b border-border shrink-0 flex flex-wrap gap-4 text-xs text-neutral-800">
          <span>📅 วันที่ 11 มิถุนายน 2569</span>
          <span>📍 ห้องประชุมห้อง 1</span>
          <span>👥 ผู้เข้าร่วม 16 ท่าน</span>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden">
          <iframe
            src={`${announcementPdf}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
            className="w-full h-full"
            style={{ minHeight: '70vh', border: 'none' }}
            title="สรุปการประชุม"
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0 flex justify-end">
          <button
            onClick={() => setShowAnnouncement(false)}
            className="px-5 py-2 bg-neutral-700 hover:bg-neutral-800 text-white text-sm font-medium rounded-lg transition"
          >
            รับทราบ
          </button>
        </div>

      </div>
    </div>
  )
}

function RootLayout() {
  const { isAuthenticated } = useAuth()

  return (
    <LanguageProvider availableLanguages={['en', 'th']}>
      <Outlet />
      <Toaster position="top-right" richColors />
      {isAuthenticated && (
        <>
          <AnnouncementPopup />
          <QrScanButton />
        </>
      )}
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