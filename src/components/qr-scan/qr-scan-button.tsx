import { useState, useEffect, useRef } from 'react'
import { QrCode, X, Camera, Flashlight } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { Html5Qrcode } from 'html5-qrcode'
import { createPortal } from 'react-dom'
import { api } from '@/core/interceptor/api.interceptor'
import { toast } from 'sonner'
import { useTranslation } from '@/core/contexts/language-context'

const QR_READER_ID = 'qr-reader-container'

export function QrScanButton() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanned, setScanned] = useState<string | null>(null)
  const [torch, setTorch] = useState(false)
  const [checking, setChecking] = useState(false)

  const readerRef = useRef<Html5Qrcode | null>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)

  const { navigate } = useRouter()
  const { t } = useTranslation('checklist')

  const extractMachineCode = (decoded: string): string => {
    try {
      const parsed = JSON.parse(decoded)
      if (parsed?.code) return parsed.code
    } catch {}
    try {
      const url = new URL(decoded)
      const param = url.searchParams.get('machineCode')
      if (param) return param
    } catch {}
    return decoded
  }

  // ─── เช็ค machine status ก่อน navigate ───────────────────────────────────
  const handleScanned = async (decodedText: string) => {
    // ถ้าเป็น URL ให้ navigate ตรงเลยโดยไม่เช็ค
    try {
      const url = new URL(decodedText)
      navigate({ to: url.pathname as any })
      closeModal()
      return
    } catch {}

    const machineCode = extractMachineCode(decodedText)
    setChecking(true)

    try {
      const res = await api.get<any>(`/api/machine/machine-code/${machineCode}`)

      if (!res?.success) {
        toast.error(t('qr_machine_not_operational'))
        setScanned(null)
        restartCamera()
        return
      }

      // OPERATIONAL → navigate ไปหน้า add
      closeModal()
      window.location.href = `/checklist/checklist-records/add?machineCode=${encodeURIComponent(machineCode)}`

    } catch {
      toast.error(t('qr_check_failed'))
      setScanned(null)
      restartCamera()
    } finally {
      setChecking(false)
    }
  }

  const restartCamera = async () => {
    if (!readerRef.current) return
    try {
      const devices = await Html5Qrcode.getCameras()
      if (!devices || devices.length === 0) return
      const backCamera =
        devices.find(d => /back|rear|environment/i.test(d.label)) ??
        devices[devices.length - 1]
      await readerRef.current.start(
        backCamera.id,
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          setScanned(decodedText)
          readerRef.current?.stop().catch(() => {})
          setTimeout(() => handleScanned(decodedText), 600)
        },
        () => {}
      )
    } catch {}
  }

  useEffect(() => {
    if (!open) return

    let cancelled = false

    const startScan = async () => {
      try {
        const html5Qrcode = new Html5Qrcode(QR_READER_ID)
        readerRef.current = html5Qrcode

        const devices = await Html5Qrcode.getCameras()

        if (!devices || devices.length === 0) {
          setError(t('qr_no_camera'))
          return
        }

        const backCamera =
          devices.find(d => /back|rear|environment/i.test(d.label)) ??
          devices[devices.length - 1]

        if (cancelled) return

        await html5Qrcode.start(
          backCamera.id,
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            if (cancelled) return
            setScanned(decodedText)
            html5Qrcode.stop().catch(() => {})
            setTimeout(() => {
              if (cancelled) return
              handleScanned(decodedText)
            }, 600)
          },
          () => {}
        )

        const videoEl = document.querySelector(
          `#${QR_READER_ID} video`
        ) as HTMLVideoElement | null
        const stream = videoEl?.srcObject as MediaStream | null
        trackRef.current = stream?.getVideoTracks()[0] ?? null

      } catch (e: any) {
        if (!cancelled) {
          if (e?.name === 'NotAllowedError' || String(e).includes('permission')) {
            setError(t('qr_camera_permission'))
          } else if (e?.name === 'NotFoundError') {
            setError(t('qr_no_camera'))
          } else {
            setError(t('qr_camera_error') + ': ' + (e?.message ?? ''))
          }
        }
      }
    }

    startScan()

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [open])

  const stopCamera = () => {
    if (readerRef.current) {
      const state = readerRef.current.getState()
      if (state === 2 || state === 3) {
        readerRef.current.stop().catch(() => {})
      }
      readerRef.current = null
    }
    trackRef.current = null
  }

  const toggleTorch = async () => {
    const track = trackRef.current
    if (!track) return
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torch } as any],
      })
      setTorch(t => !t)
    } catch {}
  }

  const closeModal = () => {
    stopCamera()
    setOpen(false)
    setError(null)
    setScanned(null)
    setTorch(false)
    setChecking(false)
  }

  return createPortal(
    <>
      {/* Floating Scan Button */}
      <button
        onClick={() => setOpen(true)}
        title={t('qr_scan_button')}
        style={{
          position: 'fixed',
          bottom: '60px',
          right: '24px',
          zIndex: 9999,
          backgroundColor: '#89090a',
        }}
        className="
          flex items-center gap-2
          hover:opacity-90 active:scale-95
          text-white font-semibold text-sm
          px-4 py-3 rounded-2xl shadow-lg
          transition-all duration-200
          group relative
        "
      >
        <QrCode className="w-5 h-5" />
        <span className="hidden sm:inline">{t('qr_scan_button')}</span>
        <span className="
          absolute inset-0 rounded-2xl
          ring-4 ring-transparent group-hover:ring-[#89090a]/30
          transition-all duration-300
        " />
      </button>

      {/* Modal */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99999 }}
          className="flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-sm mx-4 bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: '#89090a33' }}
            >
              <div className="flex items-center gap-2 text-white">
                <QrCode className="w-5 h-5" style={{ color: '#89090a' }} />
                <span className="font-semibold">{t('qr_modal_title')}</span>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-square bg-black overflow-hidden">
              {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
                  <Camera className="w-12 h-12 text-zinc-600" />
                  <p className="text-zinc-400 text-sm">{error}</p>
                </div>
              ) : checking ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse"
                    style={{ backgroundColor: '#89090a22' }}
                  >
                    <QrCode className="w-8 h-8" style={{ color: '#89090a' }} />
                  </div>
                  <p className="text-zinc-400 text-sm">{t('qr_checking')}</p>
                </div>
              ) : scanned ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center bg-zinc-900">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#89090a22' }}
                  >
                    <QrCode className="w-8 h-8" style={{ color: '#89090a' }} />
                  </div>
                  <p className="font-semibold" style={{ color: '#c0393a' }}>{t('qr_scan_success')}</p>
                  <p className="text-zinc-400 text-xs break-all max-w-xs">{scanned}</p>
                </div>
              ) : (
                <>
                  <div id={QR_READER_ID} className="w-full h-full" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-52 h-52">
                      {(['tl', 'tr', 'bl', 'br'] as const).map(pos => (
                        <span
                          key={pos}
                          style={{ borderColor: '#89090a' }}
                          className={`absolute w-8 h-8
                            ${pos === 'tl' ? 'top-0 left-0 border-t-4 border-l-4 rounded-tl-lg' : ''}
                            ${pos === 'tr' ? 'top-0 right-0 border-t-4 border-r-4 rounded-tr-lg' : ''}
                            ${pos === 'bl' ? 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg' : ''}
                            ${pos === 'br' ? 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg' : ''}
                          `}
                        />
                      ))}
                      <div
                        className="absolute left-2 right-2 h-0.5 rounded-full animate-[scan_2s_ease-in-out_infinite]"
                        style={{ backgroundColor: '#89090ab3' }}
                      />
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)] pointer-events-none" />
                </>
              )}
            </div>

            {!error && !scanned && !checking && (
              <div className="flex items-center justify-between px-5 py-4">
                <p className="text-zinc-500 text-xs">{t('qr_hint')}</p>
                <button
                  onClick={toggleTorch}
                  className="p-2 rounded-xl transition-colors"
                  style={torch ? { backgroundColor: '#89090a33', color: '#c0393a' } : {}}
                  title={t('qr_torch')}
                >
                  <Flashlight
                    className="w-5 h-5"
                    style={{ color: torch ? '#c0393a' : undefined }}
                  />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0%   { top: 8px; }
          50%  { top: calc(100% - 8px); }
          100% { top: 8px; }
        }
        #${QR_READER_ID} > img,
        #${QR_READER_ID} > div:last-child {
          display: none !important;
        }
        #${QR_READER_ID} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
      `}</style>
    </>,
    document.body
  )
}