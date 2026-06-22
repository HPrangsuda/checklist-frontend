import { createContext, useContext, useState } from 'react'

interface QrScanContextType {
  showAnnouncement: boolean
  setShowAnnouncement: (value: boolean) => void
}

const QrScanContext = createContext<QrScanContextType>({
  showAnnouncement: false,
  setShowAnnouncement: () => {},
})

export function QrScanProvider({ children }: { children: React.ReactNode }) {
  const [showAnnouncement, setShowAnnouncement] = useState(() => {
    const dismissed = sessionStorage.getItem('announcement_shown')
    return !dismissed
  })

  const handleSetShowAnnouncement = (value: boolean) => {
    if (!value) {
      sessionStorage.setItem('announcement_shown', 'true')
    }
    setShowAnnouncement(value)
  }

  return (
    <QrScanContext.Provider value={{ showAnnouncement, setShowAnnouncement: handleSetShowAnnouncement }}>
      {children}
    </QrScanContext.Provider>
  )
}

export const useQrScan = () => useContext(QrScanContext)