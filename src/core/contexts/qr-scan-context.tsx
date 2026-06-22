import { createContext, useContext, useState } from 'react'

interface QrScanContextType {
  hideQrButton: boolean
  setHideQrButton: (value: boolean) => void
}

const QrScanContext = createContext<QrScanContextType>({
  hideQrButton: false,
  setHideQrButton: () => {},
})

export function QrScanProvider({ children }: { children: React.ReactNode }) {
  const [hideQrButton, setHideQrButton] = useState(false)
  return (
    <QrScanContext.Provider value={{ hideQrButton, setHideQrButton }}>
      {children}
    </QrScanContext.Provider>
  )
}

export const useQrScan = () => useContext(QrScanContext)