import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { createFileRoute, useRouter, useSearch } from '@tanstack/react-router'
import { ArrowLeft, ChevronLeft, ChevronRight, Download, FileText, ListCheck, PenBox, Plus, ShieldCheck, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
import { toast } from 'sonner'

export const Route = createFileRoute('/checklist/register/view')({
  component: RegisterView,
  validateSearch: (search: Record<string, unknown>) => ({
    id: Number(search.id) || 0
  })
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MaintenanceItem {
  id: number | null
  machineName: string
  years: string
  round: number
  dueDate: string
  planDate: string
  resultDate: string | null
  status: string
  maintenanceBy: string
  note: string
  attachment: string
}

export interface CalibrationItem {
  id: number | null
  machineCode: string
  years: number
  externalCalibrationDate: string | null
  dueDate: string
  certificateDate: string
  results: string | null
  criteria: string
  measuringRange: string
  accuracy: string
  calibrationRange: string
  calibrationStatus: string
  attachment: string
}

interface AttachmentItem {
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  uploadedBy: string | null
  category?: string | null
}

interface RegisterRequest {
  machineName: string
  brand?: string
  model?: string
  serialNumber?: string
  price?: number
  quantity?: number
  watt?: number
  horsePower?: number
  department: string
  responsibleId: string
  supervisorId: string
  managerId: string
  departmentName?: string
  responsibleName?: string
  supervisorName?: string
  managerName?: string
  note?: string
  attachment?: string | AttachmentItem[]
  workInstruction?: string | AttachmentItem[]
  maintenance?: MaintenanceItem[] | string
  calibration?: CalibrationItem[] | string
  hasWarranty?: string
  warrantyNote?: string
  warrantyExpireDate?: string | null
  warrantyFiles?: string | AttachmentItem[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp']
const API_BASE   = import.meta.env.VITE_API_URL ?? ''

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    })
  } catch { return '-' }
}

const toFileUrl = (fileUrl: string) => {
  const filename = fileUrl.split('/').pop() ?? fileUrl
  return `${API_BASE}/api/files/download/${encodeURIComponent(filename)}`
}

const parseAttachments = (raw?: string | AttachmentItem[]): AttachmentItem[] => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [] }
}

const isImageFile = (fileName: string) =>
  IMAGE_EXTS.includes(fileName.split('.').pop()?.toLowerCase() ?? '')

// ─── AuthImage ────────────────────────────────────────────────────────────────

function AuthImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [failed,  setFailed]  = useState(false)

  useEffect(() => {
    let url = ''
    api.getInstance().get(src, { responseType: 'blob' })
      .then((res: any) => { url = URL.createObjectURL(res.data); setBlobUrl(url) })
      .catch(() => setFailed(true))
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [src])

  if (failed)   return null
  if (!blobUrl) return <div className="w-full h-full animate-pulse bg-muted" />
  return <img src={blobUrl} alt={alt} className={className} />
}

// ─── ImageGalleryDialog ───────────────────────────────────────────────────────

function ImageGalleryDialog({
  files,
  initialIndex,
  open,
  onClose,
}: {
  files: AttachmentItem[]
  initialIndex: number
  open: boolean
  onClose: () => void
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [blobUrls, setBlobUrls] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const blobUrlsRef = useRef<Record<number, string>>({})

  const imageFiles = files.filter(f => isImageFile(f.fileName))

  // Reset index when dialog opens
  useEffect(() => {
    if (open) setCurrentIndex(initialIndex)
  }, [open, initialIndex])

  // Load blob for current image
  useEffect(() => {
    if (!open || imageFiles.length === 0) return
    const idx = currentIndex
    if (blobUrlsRef.current[idx]) return

    setLoading(true)
    const src = toFileUrl(imageFiles[idx]?.fileUrl ?? '')
    api.getInstance().get(src, { responseType: 'blob' })
      .then((res: any) => {
        const url = URL.createObjectURL(res.data)
        blobUrlsRef.current[idx] = url
        setBlobUrls(prev => ({ ...prev, [idx]: url }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, currentIndex, imageFiles.length])

  // Preload adjacent images
  useEffect(() => {
    if (!open) return
    const preload = (idx: number) => {
      if (idx < 0 || idx >= imageFiles.length || blobUrlsRef.current[idx]) return
      const src = toFileUrl(imageFiles[idx]?.fileUrl ?? '')
      api.getInstance().get(src, { responseType: 'blob' })
        .then((res: any) => {
          const url = URL.createObjectURL(res.data)
          blobUrlsRef.current[idx] = url
          setBlobUrls(prev => ({ ...prev, [idx]: url }))
        })
        .catch(() => {})
    }
    preload(currentIndex - 1)
    preload(currentIndex + 1)
  }, [open, currentIndex, imageFiles.length])

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => { Object.values(blobUrlsRef.current).forEach(url => URL.revokeObjectURL(url)) }
  }, [])

  // Keyboard & body scroll lock
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft')  setCurrentIndex(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setCurrentIndex(i => Math.min(imageFiles.length - 1, i + 1))
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, imageFiles.length, onClose])

  if (!open || imageFiles.length === 0) return null

  const currentFile    = imageFiles[currentIndex]
  const currentBlobUrl = blobUrls[currentIndex]
  const hasPrev        = currentIndex > 0
  const hasNext        = currentIndex < imageFiles.length - 1

  const goPrev = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentIndex(i => Math.max(0, i - 1)) }
  const goNext = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentIndex(i => Math.min(imageFiles.length - 1, i + 1)) }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* ── Top bar ── */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-black/60 shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <p className="text-white text-sm truncate max-w-[50vw]">{currentFile?.fileName}</p>
          {imageFiles.length > 1 && (
            <span className="text-white/50 text-sm shrink-0">
              {currentIndex + 1} / {imageFiles.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {currentBlobUrl && (
            <a
              href={currentBlobUrl}
              download={currentFile?.fileName}
              className="flex items-center gap-1.5 text-white text-sm px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <Download className="h-4 w-4" /> ดาวน์โหลด
            </a>
          )}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-white text-sm px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4" /> ปิด
          </button>
        </div>
      </div>

      {/* ── Main image area ── */}
      <div className="flex flex-1 items-center justify-center relative overflow-hidden">
        {/* Prev */}
        {hasPrev && (
          <button
            onClick={goPrev}
            className="absolute left-3 z-10 flex items-center justify-center w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all hover:scale-110 active:scale-95 shadow-lg"
            aria-label="ก่อนหน้า"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <div
          className="relative flex items-center justify-center w-full h-full px-16"
          onClick={e => e.stopPropagation()}
        >
          {loading || !currentBlobUrl ? (
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-white/60 text-sm">กำลังโหลด...</p>
            </div>
          ) : (
            <img
              key={currentIndex}
              src={currentBlobUrl}
              alt={currentFile?.fileName}
              className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl select-none"
              draggable={false}
            />
          )}
        </div>

        {/* Next */}
        {hasNext && (
          <button
            onClick={goNext}
            className="absolute right-3 z-10 flex items-center justify-center w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all hover:scale-110 active:scale-95 shadow-lg"
            aria-label="ถัดไป"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* ── Thumbnail strip (shown only when multiple images) ── */}
      {imageFiles.length > 1 && (
        <div
          className="flex justify-center gap-2 px-4 py-3 bg-black/60 shrink-0 overflow-x-auto"
          onClick={e => e.stopPropagation()}
        >
          {imageFiles.map((f, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-all ${
                i === currentIndex
                  ? 'border-white scale-105'
                  : 'border-white/20 opacity-50 hover:opacity-90 hover:border-white/50'
              }`}
              aria-label={`ดูรูป ${i + 1}`}
            >
              {blobUrls[i]
                ? <img src={blobUrls[i]} alt={f.fileName} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-white/10 animate-pulse" />
              }
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── AttachmentFile ───────────────────────────────────────────────────────────

function AttachmentFile({
  file,
  galleryFiles,
  galleryIndex,
  onOpenGallery,
}: {
  file: AttachmentItem
  galleryFiles?: AttachmentItem[]
  galleryIndex?: number
  onOpenGallery?: (index: number) => void
}) {
  const ext     = file.fileName.split('.').pop()?.toLowerCase() ?? ''
  const isImage = IMAGE_EXTS.includes(ext)
  const src     = toFileUrl(file.fileUrl)
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (isImage && onOpenGallery && galleryIndex !== undefined) {
      onOpenGallery(galleryIndex)
      return
    }

    // Non-image: open in new tab
    setLoading(true)
    try {
      const res = await api.getInstance().get(src, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch {
      toast.error('โหลดไฟล์ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={handleClick}
      title={file.fileName}
      className="group relative flex flex-col items-center justify-center w-20 h-20 rounded-lg border border-border bg-muted hover:border-primary transition-all overflow-hidden shrink-0 cursor-pointer"
    >
      {isImage ? (
        <>
          <AuthImage src={src} alt={file.fileName} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            {loading
              ? <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <p className="text-[10px] text-white text-center px-1">🔍 ดูเต็มจอ</p>}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 p-1 w-full h-full">
          <FileText className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-[10px] text-muted-foreground text-center leading-tight line-clamp-2 break-all px-1">
            {file.fileName}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── AttachmentList ───────────────────────────────────────────────────────────

function AttachmentList({ attachment }: { attachment?: string | AttachmentItem[] }) {
  const files = parseAttachments(attachment)
  const [galleryOpen,  setGalleryOpen]  = useState(false)
  const [galleryStart, setGalleryStart] = useState(0)

  if (files.length === 0) return null

  // Build a separate index for only image files (for gallery navigation)
  const imageFiles = files.filter(f => isImageFile(f.fileName))

  const handleOpenGallery = (imageIndex: number) => {
    setGalleryStart(imageIndex)
    setGalleryOpen(true)
  }

  // Map each file to its image-gallery index (null for non-images)
  let imgCursor = 0
  const filesMapped = files.map(f => {
    if (isImageFile(f.fileName)) {
      const idx = imgCursor++
      return { file: f, galleryIndex: idx }
    }
    return { file: f, galleryIndex: null }
  })

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {filesMapped.map(({ file, galleryIndex }, i) => (
          <AttachmentFile
            key={i}
            file={file}
            galleryFiles={imageFiles}
            galleryIndex={galleryIndex ?? undefined}
            onOpenGallery={galleryIndex !== null ? handleOpenGallery : undefined}
          />
        ))}
      </div>

      {imageFiles.length > 0 && (
        <ImageGalleryDialog
          files={imageFiles}
          initialIndex={galleryStart}
          open={galleryOpen}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </>
  )
}

// ─── CalibrationRecordItem ────────────────────────────────────────────────────

function CalibrationRecordItem({ record }: { record: CalibrationItem }) {
  const { t } = useTranslation('checklist')
  return (
    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900/30">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoRow label={t('external_calibration_date')} value={formatDate(record.externalCalibrationDate)} />
        <InfoRow label={t('calibration_due_date')}      value={formatDate(record.dueDate)} />
        <InfoRow label={t('certificate_date')}          value={formatDate(record.certificateDate)} />
        <InfoRow label={t('results')}                   value={record.results ?? '-'} />
        <InfoRow label={t('criteria')}                  value={record.criteria ?? '-'} />
        <InfoRow label={t('measuring_range')}           value={record.measuringRange ?? '-'} />
        <InfoRow label={t('accuracy')}                  value={record.accuracy ?? '-'} />
        <InfoRow label={t('calibration_range')}         value={record.calibrationRange ?? '-'} />
        <InfoRow
          label={t('calibration_status')}
          value={
            <Badge variant="outline" className={`
              ${record.calibrationStatus?.includes('On Time') ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : ''}
              ${record.calibrationStatus?.includes('Overdue') ? 'bg-red-100 text-red-800 border-red-300' : ''}
              ${!record.calibrationStatus ? 'bg-gray-100 text-gray-800' : ''}
            `}>
              {record.calibrationStatus ?? '-'}
            </Badge>
          }
        />
        {record.attachment && (
          <div className="col-span-2 mt-2">
            <p className="text-sm font-medium text-muted-foreground mb-1">{t('attachment')}</p>
            <a href={record.attachment} target="_blank" rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />{t('view_certificate')}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value, className = '' }: { label: string; value?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <div className="text-base">{value ?? '-'}</div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function RegisterView() {
  const { id }  = useSearch({ from: '/checklist/register/view' })
  const { t }   = useTranslation('checklist')
  const router  = useRouter()

  const [record,  setRecord]  = useState<RegisterRequest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (id) fetchData() }, [id])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await api.get<any>(`/api/register/${id}`)
      if (res?.data) {
        const d = { ...res.data }
        if (typeof d.maintenance === 'string') {
          try { d.maintenance = JSON.parse(d.maintenance) } catch { d.maintenance = [] }
        }
        if (typeof d.calibration === 'string') {
          try { d.calibration = JSON.parse(d.calibration) } catch { d.calibration = [] }
        }
        if (typeof d.attachment === 'string') {
          try { d.attachment = JSON.parse(d.attachment) } catch { d.attachment = [] }
        }
        if (typeof d.workInstruction === 'string') {
          try { d.workInstruction = JSON.parse(d.workInstruction) } catch { d.workInstruction = [] }
        }
        if (typeof d.warrantyFiles === 'string') {
          try { d.warrantyFiles = JSON.parse(d.warrantyFiles) } catch { d.warrantyFiles = [] }
        }
        setRecord(d)
      } else {
        toast.error(t('failed_to_load_register'))
      }
    } catch {
      toast.error(t('failed_to_load_register'))
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-6">
      <Skeleton className="h-12 w-64 mb-6" />
      <Skeleton className="h-96 w-full" />
    </div>
  )

  if (!record) return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-6">
      <Card>
        <CardContent className="p-10 text-center">
          <p className="text-muted-foreground mb-6">{t('data_not_found')}</p>
          <Button onClick={() => router.navigate({ to: '/checklist/register' })}>
            <ArrowLeft className="mr-2 h-4 w-4" />{t('back_to_list')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  const maintenanceItems  = Array.isArray(record.maintenance) ? record.maintenance : []
  const calibrationItems  = Array.isArray(record.calibration) ? record.calibration : []

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon"
              onClick={() => router.navigate({ to: '/checklist/register' })}
              className="hover:bg-accent">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <PenBox className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">{record.machineName}</h1>
            </div>
          </div>
          <Button
            onClick={() => router.navigate({ to: '/checklist/machine/add', search: { refId: id } })}
            className="gap-2">
            <Plus className="h-4 w-4" />{t('add_machine')}
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">

        {/* Register Information */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="font-semibold">{t('register_information')}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <InfoRow label={t('machine_name')}  value={record.machineName ?? '-'} />
              <InfoRow label={t('department')}    value={record.departmentName  ?? record.department  ?? '-'} />
              <InfoRow label={t('brand')}         value={record.brand ?? '-'} />
              <InfoRow label={t('model')}         value={record.model ?? '-'} />
              <InfoRow label={t('serial_number')} value={record.serialNumber ?? '-'} />
              <InfoRow label={t('quantity')}      value={record.quantity ?? '-'} />
              <InfoRow label={t('watt')}          value={record.watt != null ? String(record.watt) : '-'} />
              <InfoRow label={t('horse_power')}   value={record.horsePower != null ? String(record.horsePower) : '-'} />
              <InfoRow
                label={t('price')}
                value={record.price != null
                  ? record.price.toLocaleString('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 })
                  : '-'}
              />
              <InfoRow label={t('responsible')} value={record.responsibleName ?? record.responsibleId ?? '-'} />
              <InfoRow label={t('supervisor')}  value={record.supervisorName  ?? record.supervisorId  ?? '-'} />
              <InfoRow label={t('manager')}     value={record.managerName     ?? record.managerId     ?? '-'} />
            </div>

            <div className="mt-8 space-y-6">
              {record.note && (
                <div className="p-4 rounded-lg bg-secondary/40 border border-border/50">
                  <p className="text-sm font-medium text-muted-foreground mb-2">{t('note')}</p>
                  <p className="text-foreground whitespace-pre-wrap">{record.note}</p>
                </div>
              )}

              {/* ── รูปภาพ (attachment) ── */}
              {parseAttachments(record.attachment).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">{t('images')}</p>
                  <AttachmentList attachment={record.attachment} />
                </div>
              )}

              {/* ── Work instruction ── */}
              {parseAttachments(record.workInstruction).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">{t('work_instructions')}</p>
                  <AttachmentList attachment={record.workInstruction} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Warranty Information */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {t('warranty')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <InfoRow
                label={t('has_warranty')}
                value={
                  <span className={[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    record.hasWarranty === 'YES'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : record.hasWarranty === 'NO'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-gray-100 text-gray-600',
                  ].join(' ')}>
                    {record.hasWarranty === 'YES'
                      ? t('yes')
                      : record.hasWarranty === 'NO'
                        ? t('no')
                        : '-'}
                  </span>
                }
              />
              {record.hasWarranty === 'YES' && (
                <>
                  <InfoRow label={t('warranty_note')}        value={record.warrantyNote       || '-'} />
                  <InfoRow label={t('warranty_expire_date')} value={formatDate(record.warrantyExpireDate)} />
                </>
              )}
            </div>

            {record.hasWarranty === 'YES' && parseAttachments(record.warrantyFiles).length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-medium text-muted-foreground mb-3">{t('warranty_documents')}</p>
                <AttachmentList attachment={record.warrantyFiles} />
              </div>
            )}

            {!record.hasWarranty && (
              <p className="text-sm text-muted-foreground">{'-'}</p>
            )}
          </CardContent>
        </Card>

        {/* Maintenance Records */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 font-semibold">
              <ListCheck className="h-5 w-5 text-primary" />
              {t('maintenance_records')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {maintenanceItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800 border-b">
                      <th className="text-left p-3 font-semibold text-sm">{t('round')}</th>
                      <th className="text-left p-3 font-semibold text-sm">{t('years')}</th>
                      <th className="text-left p-3 font-semibold text-sm">{t('due_date')}</th>
                      <th className="text-left p-3 font-semibold text-sm">{t('plan_date')}</th>
                      <th className="text-left p-3 font-semibold text-sm">{t('result_date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...maintenanceItems].sort((a, b) => a.round - b.round).map(item => (
                      <tr key={item.id ?? `${item.round}-${item.years}`}
                        className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="p-3 text-sm">{item.round}</td>
                        <td className="p-3 text-sm">{item.years}</td>
                        <td className="p-3 text-sm">{formatDate(item.dueDate)}</td>
                        <td className="p-3 text-sm">{formatDate(item.planDate)}</td>
                        <td className="p-3 text-sm">{formatDate(item.resultDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">{t('no_maintenance_records')}</div>
            )}
          </CardContent>
        </Card>

        {/* Calibration Information */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 font-semibold">
              <ListCheck className="h-5 w-5 text-primary" />
              {t('calibration_information')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {calibrationItems.length > 0 ? (
              <div className="space-y-6">
                {calibrationItems.map((item, i) => (
                  <CalibrationRecordItem key={item.id ?? i} record={item} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">{t('no_calibration_records')}</div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}