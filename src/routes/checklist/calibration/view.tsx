import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { createFileRoute, useRouter, useSearch } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, Download, Edit3, FileText, PencilRuler, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
import { toast } from 'sonner'
import { CalibrationTbl } from '@/module/checklist/calibration/history-table'

export const Route = createFileRoute('/checklist/calibration/view')({
  component: CalibrationView,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      id: Number(search.id) || 0
    }
  }
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalibrationRecord {
  id: number
  machineCode: string
  machineName: string
  years: number
  dueDate?: string
  startDate?: string
  certificateDate?: string
  results?: string
  criteria?: string
  measuringRange?: string
  accuracy?: string
  calibrationRange?: string
  calibrationStatus?: string
  attachment?: string
  note?: string
  permissibleCapacity?: string
  comment?: string
  resolution?: string
  maxUncertainty?: string
  mpe?: string
  checkMpe?: string
  checkResolution?: string
  checkResult?: string
  reasonNotPass?: string
}

interface AttachmentItem {
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  uploadedBy: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp']
const API_BASE   = import.meta.env.VITE_API_URL ?? ''

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toFileUrl = (fileUrl: string) => {
  const filename = fileUrl.split('/').pop() ?? fileUrl
  return `${API_BASE}/api/files/download/${encodeURIComponent(filename)}`
}

const parseAttachments = (raw?: string | null): AttachmentItem[] => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [] }
}

// ─── getStatusColor ───────────────────────────────────────────────────────────

export const getStatusColor = (status: string) => {
  switch ((status ?? '').toLowerCase()) {
    case 'operational':
    case 'completed':
    case 'ready to use':
    case 'pass':
    case 'on time':
      return 'bg-emerald-100 text-emerald-600 dark:text-emerald-100'
    case 'pending manager':
    case 'not ready (waiting for repair)':
      return 'bg-yellow-100 text-yellow-600 dark:text-yellow-100'
    case 'under maintenance':
    case 'pending supervisor':
      return 'bg-orange-100 text-orange-600 dark:text-orange-100'
    case 'canceled':
    case 'pending':
    case 'overdue':
    case 'not pass':
    case 'not ready (under repair)':
      return 'bg-red-100 text-red-600 dark:text-red-100'
    case 'not ready (equipment modification)':
      return 'bg-blue-100 text-blue-600 dark:text-blue-100'
    case 'transfer':
      return 'bg-purple-100 text-purple-600 dark:text-purple-100'
    case 'scrapped':
      return 'bg-mauve text-mauve-foreground dark:text-mauve-foreground'
    case 'not found':
      return 'bg-pink-100 text-pink-600 dark:text-pink-100'
    default:
      return 'bg-zinc-100 text-zinc-600 dark:text-zinc-100'
  }
}

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

// ─── ImageDialog ──────────────────────────────────────────────────────────────

function ImageDialog({ blobUrl, fileName, open, onClose }: {
  blobUrl: string; fileName: string; open: boolean; onClose: () => void
}) {
  const { t } = useTranslation('checklist')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) { window.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden' }
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm" onClick={onClose}>
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-black/60" onClick={e => e.stopPropagation()}>
        <p className="text-white text-sm truncate max-w-[60%]">{fileName}</p>
        <div className="flex items-center gap-2">
          <a href={blobUrl} download={fileName}
            className="flex items-center gap-1.5 text-white text-sm px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
            onClick={e => e.stopPropagation()}>
            <Download className="h-4 w-4" /> {t('download')}
          </a>
          <button onClick={onClose}
            className="flex items-center gap-1.5 text-white text-sm px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors">
            <X className="h-4 w-4" /> {t('close')}
          </button>
        </div>
      </div>
      <img src={blobUrl} alt={fileName}
        className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl mt-14"
        onClick={e => e.stopPropagation()} />
    </div>
  )
}

// ─── AttachmentFile ───────────────────────────────────────────────────────────

function AttachmentFile({ file }: { file: AttachmentItem }) {
  const { t }   = useTranslation('checklist')
  const ext     = file.fileName.split('.').pop()?.toLowerCase() ?? ''
  const isImage = IMAGE_EXTS.includes(ext)
  const src     = toFileUrl(file.fileUrl)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [blobUrl,    setBlobUrl]    = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)

  const handleClick = async () => {
    if (isImage) {
      if (blobUrl) { setDialogOpen(true); return }
      setLoading(true)
      try {
        const res = await api.getInstance().get(src, { responseType: 'blob' })
        const url = URL.createObjectURL(res.data)
        setBlobUrl(url); setDialogOpen(true)
      } catch { toast.error(t('data_fetch_failed')) }
      finally { setLoading(false) }
    } else {
      try {
        const res = await api.getInstance().get(src, { responseType: 'blob' })
        const url = URL.createObjectURL(res.data)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      } catch { toast.error(t('data_fetch_failed')) }
    }
  }

  return (
    <>
      <div onClick={handleClick} title={file.fileName}
        className="group relative flex flex-col items-center justify-center w-20 h-20 rounded-lg border border-border bg-muted hover:border-primary transition-all overflow-hidden shrink-0 cursor-pointer">
        {isImage ? (
          <>
            <AuthImage src={src} alt={file.fileName} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              {loading
                ? <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <p className="text-[10px] text-white text-center px-1">🔍 {t('view_fullscreen')}</p>}
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
      {isImage && blobUrl && (
        <ImageDialog blobUrl={blobUrl} fileName={file.fileName} open={dialogOpen} onClose={() => setDialogOpen(false)} />
      )}
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function CalibrationView() {
  const { id } = useSearch({ from: '/checklist/calibration/view' })
  const [record, setCalibration] = useState<CalibrationRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation('checklist')
  const router = useRouter()

  useEffect(() => {
    if (id) fetchCalibrationDetail()
  }, [id])

  const fetchCalibrationDetail = async () => {
    try {
      setLoading(true)
      const response = await api.get<any>(`/api/calibration/${id}`)
      if (response) {
        setCalibration(response.data || response)
      } else {
        toast.error(t('failed_to_load_calibration'))
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error(t('failed_to_load_calibration'))
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => router.navigate({ to: '/checklist/calibration' })
  const handleEdit = () => router.navigate({ to: '/checklist/calibration/edit', search: { id } })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Skeleton className="h-12 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">{t('data_not_found')}</p>
            <Button onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('back_to_list')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const attachments = parseAttachments(record.attachment)

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack} className="hover:bg-accent">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <PencilRuler className="h-6 w-6 text-red-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{record.machineName}</h1>
                <p className="text-sm text-muted-foreground">{record.machineCode}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleEdit}>
              <Edit3 className="h-4 w-4" />
              {t('edit')}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Calibration Details */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-foreground font-semibold">
              <PencilRuler className="h-5 w-5 text-primary" />
              {t('calibration_information')}
              {record.years ? ` - ${record.years}` : ''}
              {record.calibrationStatus && (
                <Badge className={getStatusColor(record.calibrationStatus)}>
                  {record.calibrationStatus}
                </Badge>
              )}
              {record.results && (
                <Badge className={getStatusColor(record.results)}>
                  {record.results}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoRow label={t('due_date')}             value={record.dueDate} />
              <InfoRow label={t('start_date')}           value={record.startDate} />
              <InfoRow label={t('certificate_date')}     value={record.certificateDate} />
              <InfoRow label={t('criteria')}             value={record.criteria} />
              <InfoRow label={t('accuracy')}             value={record.accuracy} />
              <InfoRow label={t('measuring_range')}      value={record.measuringRange} />
              <InfoRow label={t('calibration_range')}    value={record.calibrationRange} />
              <InfoRow label={t('resolution')}           value={record.resolution} />
              <InfoRow label={t('mpe')}                  value={record.mpe} />
              <InfoRow label={t('max_uncertainty')}      value={record.maxUncertainty} />
              <InfoRow label={t('permissible_capacity')} value={record.permissibleCapacity} />
            </div>

            <div className="grid grid-cols-1 pt-6 gap-4">
              <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                <p className="text-sm font-medium text-muted-foreground mb-2">{t('note')}</p>
                <p className="text-foreground">{record.note || '-'}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                <p className="text-sm font-medium text-muted-foreground mb-2">{t('comment')}</p>
                <p className="text-foreground">{record.comment || '-'}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                <p className="text-sm font-medium text-muted-foreground mb-2">{t('reason_not_pass')}</p>
                <p className="text-foreground">{record.reasonNotPass || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Check Results */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-foreground font-semibold">
              <CheckCircle2 className="h-5 w-5 text-success" />
              {t('check_results')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2 pb-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoRow label={t('check_mpe')}        value={record.checkMpe} />
              <InfoRow label={t('check_resolution')} value={record.checkResolution} />
              <InfoRow label={t('check_result')}     value={record.checkResult} />
            </div>
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-foreground font-semibold">
              <FileText className="h-5 w-5 text-primary" />
              {t('attachments')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-4">
            {attachments.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {attachments.map((f, i) => <AttachmentFile key={i} file={f} />)}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('no_attachments')}</p>
            )}
          </CardContent>
        </Card>

        <CalibrationTbl machineCode={record.machineCode} />
      </div>
    </div>
  )
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  className = ''
}: {
  label: string
  value?: string | number | null
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base mt-1">{value || '-'}</p>
    </div>
  )
}