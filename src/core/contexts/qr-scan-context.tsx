import { createContext, useContext, useState } from 'react'

interface QrScanContextType {
  showAnnouncement: boolean
  setShowAnnouncement: (value: boolean) => void
}

const QrScanContext = createContext<QrScanContextType>({
  showAnnouncement: true,
  setShowAnnouncement: () => {},
})

export function QrScanProvider({ children }: { children: React.ReactNode }) {
  const [showAnnouncement, setShowAnnouncement] = useState(true)

  return (
    <QrScanContext.Provider value={{ showAnnouncement, setShowAnnouncement }}>
      {children}
    </QrScanContext.Provider>
  )
}

export const useQrScan = () => useContext(QrScanContext)