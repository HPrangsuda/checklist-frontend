import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { createFileRoute, useRouter, useSearch } from '@tanstack/react-router'
import { ArrowLeft, Download, FileText, ListCheck, PenBox, Plus, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
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
  maintenance?: MaintenanceItem[] | string
  calibration?: CalibrationItem[] | string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp']
const API_BASE   = import.meta.env.VITE_API_URL ?? ''

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateStr: string | null) => {
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

// ─── ImageDialog ─────────────────────────────────────────────────────────────

function ImageDialog({ blobUrl, fileName, open, onClose }: {
  blobUrl: string; fileName: string; open: boolean; onClose: () => void
}) {
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
            <Download className="h-4 w-4" /> ดาวน์โหลด
          </a>
          <button onClick={onClose}
            className="flex items-center gap-1.5 text-white text-sm px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors">
            <X className="h-4 w-4" /> ปิด
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
      } catch { toast.error('โหลดไฟล์ไม่สำเร็จ') }
      finally { setLoading(false) }
    } else {
      try {
        const res = await api.getInstance().get(src, { responseType: 'blob' })
        const url = URL.createObjectURL(res.data)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      } catch { toast.error('โหลดไฟล์ไม่สำเร็จ') }
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
      {isImage && blobUrl && (
        <ImageDialog blobUrl={blobUrl} fileName={file.fileName} open={dialogOpen} onClose={() => setDialogOpen(false)} />
      )}
    </>
  )
}

// ─── AttachmentList ───────────────────────────────────────────────────────────

function AttachmentList({ attachment }: { attachment?: string | AttachmentItem[] }) {
  const files = parseAttachments(attachment)
  if (files.length === 0) return null
  return (
    <div className="flex flex-wrap gap-3">
      {files.map((f, i) => <AttachmentFile key={i} file={f} />)}
    </div>
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

  const maintenanceItems = Array.isArray(record.maintenance) ? record.maintenance : []
  const calibrationItems = Array.isArray(record.calibration) ? record.calibration : []

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
              {parseAttachments(record.attachment).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">{t('attachment')}</p>
                  <AttachmentList attachment={record.attachment} />
                </div>
              )}
            </div>
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