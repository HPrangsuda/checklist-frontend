import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { createFileRoute, useRouter, useSearch } from '@tanstack/react-router'
import {
  ArrowLeft, CheckCircle2, ClipboardList, Download,
  Edit3, FileText, Wrench, X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
import { toast } from 'sonner'
import { MaintenanceTbl } from '@/module/checklist/maintenance/history-table'

export const Route = createFileRoute('/checklist/maintenance/view')({
  component: MaintenanceView,
  validateSearch: (search: Record<string, unknown>) => ({
    id: Number(search.id) || 0,
  }),
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface MaintenanceRecord {
  id:                      number
  machineCode:             string
  machineName:             string
  years:                   string
  round:                   number
  dueDate?:                string
  planDate?:               string
  startDate?:              string
  actualDate?:             string
  status?:                 string
  maintenanceBy?:          string
  responsibleMaintenance?: string
  note?:                   string
  attachment?:             string
  checklistRecordId?:      number | null
}

interface AttachmentItem {
  fileName:   string
  fileUrl:    string
  fileType:   string
  fileSize:   number
  uploadedBy: string | null
}

interface ChecklistItem {
  id:           number
  questionDetail: string
  answerChoice:   string
  checkStatus:    boolean
}

interface ChecklistRecord {
  id:            number
  machineCode:   string
  machineName:   string
  machineStatus: string
  maintenanceBy: string
  actualDate:    string | null
  items:         ChecklistItem[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp']
const API_BASE   = import.meta.env.VITE_API_URL ?? ''

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (date?: string | null) => {
  if (!date) return '-'
  try { return new Date(date).toLocaleDateString('th-TH') }
  catch { return date }
}

const getStatusColor = (status?: string) => {
  switch ((status || '').toLowerCase()) {
    case 'operational': case 'completed':
      return 'bg-emerald-100 text-emerald-600 dark:text-emerald-100'
    case 'under repair': case 'pending': case 'overdue':
      return 'bg-red-100 text-red-600 dark:text-red-100'
    case 'non-operational': case 'pending manager': case 'scheduled':
      return 'bg-yellow-100 text-yellow-600 dark:text-yellow-100'
    case 'pending supervisor': case 'completed (late)':
      return 'bg-orange-100 text-orange-600 dark:text-orange-100'
    case 'in progress':
      return 'bg-blue-100 text-blue-600 dark:text-blue-100'
    default:
      return 'bg-zinc-100 text-zinc-600 dark:text-zinc-100'
  }
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

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({
  label, value, className = '',
}: {
  label: string; value?: string | number | null; className?: string
}) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base mt-1">{value || '-'}</p>
    </div>
  )
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) { window.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden' }
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}>
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-black/60"
        onClick={e => e.stopPropagation()}>
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
        <ImageDialog blobUrl={blobUrl} fileName={file.fileName}
          open={dialogOpen} onClose={() => setDialogOpen(false)} />
      )}
    </>
  )
}

// ─── AttachmentList ───────────────────────────────────────────────────────────

function AttachmentList({ attachment }: { attachment?: string | AttachmentItem[] }) {
  const files = parseAttachments(attachment)
  if (files.length === 0) return <p className="text-sm text-muted-foreground">-</p>
  return (
    <div className="flex flex-wrap gap-3">
      {files.map((f, i) => <AttachmentFile key={i} file={f} />)}
    </div>
  )
}

// ─── ChecklistView ────────────────────────────────────────────────────────────

function ChecklistView({ checklist }: { checklist: ChecklistRecord }) {
  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-xl border border-border">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">สถานะเครื่องจักร</p>
          <p className="text-sm font-medium">{checklist.machineStatus || '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">ซ่อมบำรุงโดย</p>
          <p className="text-sm font-medium">{checklist.maintenanceBy || '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">วันที่ดำเนินการ</p>
          <p className="text-sm font-medium">{formatDate(checklist.actualDate)}</p>
        </div>
      </div>

      {/* Checklist items */}
      {checklist.items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">ไม่มีรายการตรวจสอบ</p>
      ) : (
        <div className="space-y-3">
          {checklist.items.map((item, idx) => (
            <div key={item.id}
              className="p-4 rounded-xl border border-border bg-background">
              <p className="text-sm font-medium leading-snug">
                {idx + 1}. {item.questionDetail || 'N/A'}
              </p>
              <div className="mt-3">
                {item.answerChoice ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {item.answerChoice}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                    —
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function MaintenanceView() {
  const { id }  = useSearch({ from: '/checklist/maintenance/view' })
  const { t }   = useTranslation('checklist')
  const router  = useRouter()

  const [record,          setRecord]          = useState<MaintenanceRecord | null>(null)
  const [loading,         setLoading]         = useState(true)
  const [responsibleName, setResponsibleName] = useState<string>('')
  const [checklist,       setChecklist]       = useState<ChecklistRecord | null>(null)
  const [checklistLoading, setChecklistLoading] = useState(false)

  useEffect(() => { if (id) fetchDetail() }, [id])

  const fetchDetail = async () => {
    try {
      setLoading(true)
      const response = await api.get<any>(`/api/maintenance/${id}`)
      if (!response?.data) {
        toast.error('Failed to load maintenance details')
        return
      }

      const data: MaintenanceRecord = response.data
      setRecord(data)

      // Resolve responsible person name
      if (data.responsibleMaintenance) {
        try {
          const memberRes = await api.get<any>(`/api/user/${data.responsibleMaintenance}`)
          if (memberRes?.data) {
            const d = memberRes.data
            setResponsibleName([d.firstName, d.lastName].filter(Boolean).join(' '))
          }
        } catch {
          setResponsibleName(String(data.responsibleMaintenance))
        }
      }

      // Fetch checklist record
      if (data.checklistRecordId) {
        fetchChecklist(data.checklistRecordId, Number(id))
      }
    } catch {
      toast.error('Failed to load maintenance details')
    } finally {
      setLoading(false)
    }
  }

  const fetchChecklist = async (checklistRecordId: number, maintenanceId: number) => {
    setChecklistLoading(true)
    try {
      // Real endpoint confirmed: /api/checklist/{checklistRecordId}
      const res  = await api.get<any>(`/api/checklist/${checklistRecordId}`)
      const body = res?.data ?? res

      // machineChecklist is a JSON-encoded string inside the response
      let rawItems: any[] = []
      if (body?.machineChecklist) {
        try {
          rawItems = typeof body.machineChecklist === 'string'
            ? JSON.parse(body.machineChecklist)
            : body.machineChecklist
        } catch {
          rawItems = []
        }
      }

      const items: ChecklistItem[] = rawItems.map((item: any) => ({
        id:             item.id,
        questionDetail: item.questionDetail ?? '',
        answerChoice:   item.answerChoice   ?? item.answer ?? '',
        checkStatus:    item.checkStatus    ?? true,
      }))

      setChecklist({
        id:            body?.id          ?? checklistRecordId,
        machineCode:   body?.machineCode ?? '',
        machineName:   body?.machineName ?? '',
        machineStatus: body?.machineStatus ?? '',
        maintenanceBy: body?.maintenanceBy ?? '',
        actualDate:    body?.actualDate    ?? null,
        items,
      })
    } catch (err) {
      console.warn('[MaintenanceView] fetchChecklist failed:', err)
      // Fallback: try /api/maintenance-checklist/get/{maintenanceId}
      try {
        const res  = await api.get<any>(`/api/maintenance-checklist/get/${maintenanceId}`)
        const body = res?.data ?? res
        const rawItems: any[] = body?.checklistItems ?? body?.items ?? []
        const items: ChecklistItem[] = rawItems.map((item: any) => ({
          id:             item.id,
          questionDetail: item.questionDetail ?? item.question?.detail ?? '',
          answerChoice:   item.answerChoice   ?? item.answer ?? '',
          checkStatus:    item.checkStatus    ?? true,
        }))
        setChecklist({
          id:            body?.id ?? checklistRecordId,
          machineCode:   body?.machineCode   ?? '',
          machineName:   body?.machineName   ?? '',
          machineStatus: body?.machineStatus ?? body?.status ?? '',
          maintenanceBy: body?.maintenanceBy ?? '',
          actualDate:    body?.actualDate    ?? null,
          items,
        })
      } catch {
        // Leave checklist null — section will be hidden
      }
    } finally {
      setChecklistLoading(false)
    }
  }

  // ─── Loading / not-found guards ───────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Skeleton className="h-12 w-64 mb-4" />
      <Skeleton className="h-96 w-full" />
    </div>
  )

  if (!record) return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-4">Maintenance not found</p>
          <Button onClick={() => router.navigate({ to: '/checklist/maintenance' })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('back_to_list')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-card border-b border-border px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon"
              onClick={() => router.navigate({ to: '/checklist/maintenance' })}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <Wrench className="h-6 w-6 text-red-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{record.machineName}</h1>
                <p className="text-sm text-muted-foreground">{record.machineCode}</p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => router.navigate({ to: '/checklist/maintenance/edit', search: { id } })}>
            <Edit3 className="h-4 w-4" />{t('edit')}
          </Button>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* ── Maintenance Details ────────────────────────────────────────── */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-3 font-semibold">
              <Wrench className="h-5 w-5 text-primary" />
              {t('maintenance_records')} {record.years} — {t('round')} {record.round}
              {record.status && (
                <Badge className={getStatusColor(record.status)}>
                  {record.status}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label={t('due_date')}    value={formatDate(record.dueDate)} />
              <InfoRow label={t('plan_date')}   value={formatDate(record.planDate)} />
              <InfoRow label={t('result_date')} value={formatDate(record.startDate)} />
              <InfoRow label={t('external_calibration_date')} value={formatDate(record.actualDate)} />
              <InfoRow label={t('responsible_by')} value={record.maintenanceBy} />
              <InfoRow label={t('responsible')}    value={responsibleName} />
              <InfoRow label={t('note')}           value={record.note} className="md:col-span-2" />
            </div>
          </CardContent>
        </Card>

        {/* ── Checklist Record ───────────────────────────────────────────── */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 font-semibold">
              <ClipboardList className="h-5 w-5 text-primary" />
              {t('checklist_records')}
              {/* Badge: submitted / not yet */}
              {record.checklistRecordId ? (
                <span className="ml-auto flex items-center gap-1 text-xs font-normal text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t('already_submitted') || 'บันทึกแล้ว'}
                </span>
              ) : (
                <span className="ml-auto text-xs font-normal text-muted-foreground bg-muted border border-border px-2.5 py-1 rounded-full">
                  {t('not_submitted') || 'ยังไม่ได้บันทึก'}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {checklistLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : checklist ? (
              <ChecklistView checklist={checklist} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                {record.checklistRecordId
                  ? 'ไม่สามารถโหลดข้อมูลการตรวจสอบได้'
                  : 'ยังไม่มีการบันทึกผลการตรวจสอบ'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Attachments ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 font-semibold">
              <FileText className="h-5 w-5 text-primary" />
              {t('attachments')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <AttachmentList attachment={record.attachment} />
          </CardContent>
        </Card>

        {/* ── Maintenance History ────────────────────────────────────────── */}
        <MaintenanceTbl machineCode={record.machineCode} />

      </div>
    </div>
  )
}