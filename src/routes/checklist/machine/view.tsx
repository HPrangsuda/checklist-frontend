import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  ArrowLeft, CalendarCheck, ChevronLeft, ChevronRight, Download, Drill,
  Edit3, FileText, ImageIcon, Info, QrCode, ShieldCheck, Wrench, X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
import { useAuth } from '@/core/contexts/auth-context'
import { getStatusColor } from '@/utils/status.untils'
import { toast } from 'sonner'

export const Route = createFileRoute('/checklist/machine/view')({
  component: MachineView,
  validateSearch: (search: Record<string, unknown>) => ({
    id: Number(search.id) || 0,
  }),
})

// ─── Types (ตาม MachineResponseDTO ฝั่ง backend — ทุก field เป็น optional กันพัง) ──

interface CalibrationRow {
  id:               number
  years?:           string
  dueDate?:         string | null
  startDate?:       string | null
  certificateDate?: string | null
  calibrationBy?:   string | null
  result?:          string | null
  isCanceled?:      boolean | null
}

interface MaintenanceRow {
  id:             number
  round?:         number
  years?:         string
  dueDate?:       string | null
  planDate?:      string | null
  actualDate?:    string | null
  status?:        string | null
  maintenanceBy?: string | null
  isCanceled?:    boolean | null
}

interface AuditMember { firstName?: string; lastName?: string }

interface MachineDetail {
  id:                     number
  machineCode:            string
  machineName:            string
  machineNumber?:         string | null
  brand?:                 string | null
  model?:                 string | null
  serialNumber?:          string | null
  department?:            string | null
  departmentName?:        string | null
  businessUnit?:          string | null
  machineGroupName?:      string | null
  machineTypeName?:       string | null
  equipmentCategory?:     string | null
  machineStatus?:         string | null
  checkStatus?:           string | null
  responsiblePersonName?: string | null
  supervisorName?:        string | null
  managerName?:           string | null
  resetPeriod?:           string | null
  maintenancePeriod?:     string | null
  certificatePeriod?:     string | null
  isCalibration?:         boolean | null
  calibration?:           boolean | null
  isNew?:                 boolean | null
  registerDate?:          string | null
  cancelDate?:            string | null
  reasonCancel?:          string | null
  note?:                  string | null
  image?:                 string | null
  workInstruction?:       string | null
  qrCode?:                string | null
  hasWarranty?:           string | null
  warrantyNote?:          string | null
  warrantyExpireDate?:    string | null
  warrantyFiles?:         string | null
  lastReview?:            string | null
  reviewByName?:          string | null
  createdAt?:             string | null
  updatedAt?:             string | null
  createdBy?:             AuditMember | null
  updatedBy?:             AuditMember | null
  calibrationRecords?:    CalibrationRow[]
  maintenanceRecords?:    MaintenanceRow[]
}

interface FileItem { fileName: string; fileUrl: string; fileType: string }

// ─── Constants / helpers ──────────────────────────────────────────────────────

const EDITABLE_ROLES = ['SUPERVISOR', 'MANAGER', 'ADMIN', 'DEPARTMENT_ADMIN']
const IMAGE_EXTS     = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'heic']
const API_BASE       = import.meta.env.VITE_API_URL ?? ''

const formatDate = (date?: string | null) => {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return date
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const memberName = (m?: AuditMember | null) =>
  m ? [m.firstName, m.lastName].filter(Boolean).join(' ') || '-' : '-'

const toDownloadUrl = (fileUrl: string) => {
  const filename = fileUrl.split('/').pop() ?? fileUrl
  return `${API_BASE}/api/files/download/${encodeURIComponent(filename)}`
}

const isImageFile = (f: FileItem) => {
  const ext = f.fileName.split('.').pop()?.toLowerCase() ?? ''
  return IMAGE_EXTS.includes(ext) || f.fileType.startsWith('image/')
}

/** รองรับ JSON array ของ object / string, JSON ซ้อน 2 ชั้น, comma-separated, path เดี่ยว */
const parseFiles = (raw?: string | null): FileItem[] => {
  if (!raw || !raw.trim()) return []
  let list: any[]
  try {
    let v: any = JSON.parse(raw)
    if (typeof v === 'string') v = JSON.parse(v)
    list = Array.isArray(v) ? v : [v]
  } catch {
    list = raw.split(',').map(s => s.trim()).filter(Boolean)
  }
  return list
    .map((v: any): FileItem | null => {
      if (!v) return null
      if (typeof v === 'string') return { fileName: v.split('/').pop() ?? v, fileUrl: v, fileType: '' }
      const url = v.fileUrl ?? v.url ?? v.path
      if (!url) return null
      return { fileName: v.fileName ?? url.split('/').pop() ?? url, fileUrl: url, fileType: v.fileType ?? '' }
    })
    .filter((f): f is FileItem => f !== null)
}

// ─── Small UI pieces ──────────────────────────────────────────────────────────

function InfoRow({ label, value, className = '' }: {
  label: string; value?: React.ReactNode; className?: string
}) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="text-base mt-1">{value === null || value === undefined || value === '' ? '-' : value}</div>
    </div>
  )
}

function StatusBadge({ value }: { value?: string | null }) {
  if (!value) return <span>-</span>
  return <Badge className={getStatusColor(value)}>{value}</Badge>
}

function useAuthBlob(path: string | null) {
  const [src, setSrc]       = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!path) return
    let url = ''
    let cancelled = false
    setSrc(null); setFailed(false)
    api.getInstance().get(path, { responseType: 'blob' })
      .then((res: any) => { if (cancelled) return; url = URL.createObjectURL(res.data); setSrc(url) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
  }, [path])
  return { src, failed }
}

function ImageLightbox({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85" onClick={onClose}>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3 bg-black/60" onClick={e => e.stopPropagation()}>
        <p className="text-white text-sm truncate max-w-[60%]">{name}</p>
        <div className="flex items-center gap-2">
          <a href={src} download={name} className="flex items-center gap-1.5 text-white text-sm px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20">
            <Download className="h-4 w-4" /> ดาวน์โหลด
          </a>
          <button onClick={onClose} className="flex items-center gap-1.5 text-white text-sm px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20">
            <X className="h-4 w-4" /> ปิด
          </button>
        </div>
      </div>
      <img src={src} alt={name} className="max-h-[85vh] max-w-[90vw] object-contain mt-14" onClick={e => e.stopPropagation()} />
    </div>
  )
}

/** รูปเครื่องจักร — ใช้ fileUrl ตรง ๆ เหมือน drawer ในหน้ารายการ */
function MachineGallery({ files, alt }: { files: FileItem[]; alt: string }) {
  const [index, setIndex] = useState(0)
  const [open, setOpen]   = useState(false)
  const current           = files[index]
  const { src, failed }   = useAuthBlob(current ? current.fileUrl : null)

  if (files.length === 0) return (
    <div className="rounded-lg border bg-muted/30 flex items-center justify-center h-64">
      <Drill className="w-14 h-14 text-muted-foreground/20" />
    </div>
  )

  const prev = () => setIndex(i => (i - 1 + files.length) % files.length)
  const next = () => setIndex(i => (i + 1) % files.length)

  return (
    <>
      <div className="rounded-lg border overflow-hidden bg-muted/30 relative h-64 select-none">
        <button type="button" className="w-full h-full flex items-center justify-center" onClick={() => src && setOpen(true)}>
          {src ? <img src={src} alt={`${alt} ${index + 1}`} className="w-full h-full object-contain" />
            : failed ? <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
            : <div className="w-7 h-7 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />}
        </button>
        {files.length > 1 && (
          <>
            <button onClick={prev} aria-label="previous" className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={next} aria-label="next" className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center"><ChevronRight className="w-5 h-5" /></button>
            <span className="absolute top-2 right-2 text-xs text-white/90 bg-black/40 rounded px-2 py-0.5">{index + 1}/{files.length}</span>
          </>
        )}
      </div>
      {open && src && <ImageLightbox src={src} name={current.fileName} onClose={() => setOpen(false)} />}
    </>
  )
}

/** ไฟล์แนบ (warranty / work instruction) — ดาวน์โหลดผ่าน /api/files/download */
function FileTile({ file }: { file: FileItem }) {
  const isImage = isImageFile(file)
  const url     = toDownloadUrl(file.fileUrl)
  const { src } = useAuthBlob(isImage ? url : null)
  const [open, setOpen] = useState(false)

  const openFile = async () => {
    if (isImage) { if (src) setOpen(true); return }
    try {
      const res  = await api.getInstance().get(url, { responseType: 'blob' })
      const blob = URL.createObjectURL(res.data)
      window.open(blob, '_blank')
      setTimeout(() => URL.revokeObjectURL(blob), 10_000)
    } catch { toast.error('โหลดไฟล์ไม่สำเร็จ') }
  }

  return (
    <>
      <button type="button" onClick={openFile} title={file.fileName}
        className="flex flex-col items-center justify-center w-20 h-20 rounded-lg border bg-muted hover:border-primary overflow-hidden shrink-0">
        {isImage && src ? <img src={src} alt={file.fileName} className="w-full h-full object-cover" />
          : (
            <span className="flex flex-col items-center gap-1 p-1">
              <FileText className="h-7 w-7 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground text-center leading-tight line-clamp-2 break-all">{file.fileName}</span>
            </span>
          )}
      </button>
      {open && src && <ImageLightbox src={src} name={file.fileName} onClose={() => setOpen(false)} />}
    </>
  )
}

function FileList({ files }: { files: FileItem[] }) {
  if (files.length === 0) return <span>-</span>
  return <div className="flex flex-wrap gap-3">{files.map((f, i) => <FileTile key={`${f.fileUrl}-${i}`} file={f} />)}</div>
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function MachineView() {
  const { id }   = Route.useSearch()
  const { t }    = useTranslation('checklist')
  const router   = useRouter()
  const { role } = useAuth()
  const canEdit  = EDITABLE_ROLES.includes(role as string)
  const isAdmin  = role === 'ADMIN'

  // ถ้ายังไม่มี key แปลภาษา ให้ใช้ข้อความสำรอง
  const tt = (key: string, fallback: string) => { const v = t(key); return v && v !== key ? v : fallback }

  const [machine, setMachine] = useState<MachineDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!id) { setLoading(false); setError('Missing machine id'); return }
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true); setError(null)
        const res = await api.get<any>(`/api/machine/${id}`)
        if (cancelled) return
        if (res?.success === false || !res?.data) {
          setError(res?.message || 'Machine not found')
          setMachine(null)
        } else {
          setMachine(res.data as MachineDetail)
        }
      } catch {
        if (!cancelled) { setError('Failed to load machine details'); toast.error(t('data_fetch_failed')) }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  const goBack = () => router.navigate({ to: '/checklist/machine' })

  if (loading) return (
    <div className="min-h-screen bg-background p-6 max-w-7xl mx-auto space-y-4">
      <Skeleton className="h-12 w-72" />
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )

  if (!machine) return (
    <div className="min-h-screen bg-background p-6">
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6 text-center space-y-4">
          <p className="text-muted-foreground">{error ?? 'Machine not found'}</p>
          <Button onClick={goBack}><ArrowLeft className="mr-2 h-4 w-4" />{t('back_to_list')}</Button>
        </CardContent>
      </Card>
    </div>
  )

  const images        = parseFiles(machine.image)
  const warrantyFiles = parseFiles(machine.warrantyFiles)
  const wiFiles       = parseFiles(machine.workInstruction)
  const calibrations  = machine.calibrationRecords ?? []
  const maintenances  = machine.maintenanceRecords ?? []
  const isCalibration = machine.isCalibration ?? machine.calibration

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ── */}
      <div className="bg-card border-b px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Button variant="ghost" size="icon" onClick={goBack}><ArrowLeft className="h-5 w-5" /></Button>
            <div className="p-2 rounded-lg bg-red-100 shrink-0"><Drill className="h-6 w-6 text-red-700" /></div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate">{machine.machineName}</h1>
              <p className="text-sm text-muted-foreground">{machine.machineCode}</p>
            </div>
          </div>
          {canEdit && (
            <Button variant="outline" size="sm" className="gap-2 shrink-0"
              onClick={() => router.navigate({ to: '/checklist/machine/edit', search: { id } })}>
              <Edit3 className="h-4 w-4" />{t('edit')}
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* ── รูป + QR + ข้อมูลหลัก ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 font-semibold">
                <Info className="h-5 w-5 text-primary" />{tt('machine_details', 'ข้อมูลเครื่องจักร')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              <MachineGallery files={images} alt={machine.machineCode} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label={t('machine_status')} value={<StatusBadge value={machine.machineStatus} />} />
                <InfoRow label={t('check_status')}   value={<StatusBadge value={machine.checkStatus} />} />
                <InfoRow label={t('department')}     value={machine.departmentName || machine.department} />
                <InfoRow label={tt('business_unit', 'หน่วยธุรกิจ')}    value={machine.businessUnit} />
                <InfoRow label={tt('machine_group', 'กลุ่มเครื่องจักร')} value={machine.machineGroupName} />
                <InfoRow label={tt('machine_type', 'ประเภทเครื่องจักร')} value={machine.machineTypeName} />
                <InfoRow label={tt('equipment_category', 'หมวดอุปกรณ์')}
                  value={machine.equipmentCategory
                    ? <Badge variant="outline">{tt(`equipment_category_${machine.equipmentCategory}`, machine.equipmentCategory)}</Badge>
                    : null} />
                <InfoRow label={tt('machine_number', 'หมายเลขเครื่อง')}  value={machine.machineNumber} />
                <InfoRow label={tt('serial_number', 'หมายเลขซีเรียล')}   value={machine.serialNumber} />
                <InfoRow label={tt('brand', 'แบรนด์')} value={machine.brand} />
                <InfoRow label={tt('model', 'รุ่น')}    value={machine.model} />
                <InfoRow label={tt('is_new', 'เครื่องใหม่')}
                  value={machine.isNew == null ? null : machine.isNew ? t('yes') : t('no')} />
                <InfoRow label={tt('register_date', 'วันที่ลงทะเบียน')} value={formatDate(machine.registerDate)} />
                <InfoRow label={t('note')} value={machine.note} className="md:col-span-2" />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {isAdmin && (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 font-semibold"><QrCode className="h-5 w-5 text-primary" />QR Code</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 flex flex-col items-center gap-3">
                  {machine.qrCode ? (
                    <>
                      <img src={machine.qrCode} alt={`QR ${machine.machineCode}`} className="w-48 h-auto border rounded" />
                      <a href={machine.qrCode} download={`${machine.machineCode}-qr.png`}>
                        <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" />{tt('download', 'ดาวน์โหลด')}</Button>
                      </a>
                    </>
                  ) : <p className="text-sm text-muted-foreground">-</p>}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 font-semibold"><Wrench className="h-5 w-5 text-primary" />{tt('people_and_periods', 'ผู้รับผิดชอบและรอบเวลา')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <InfoRow label={t('responsible')}                value={machine.responsiblePersonName} />
                <InfoRow label={tt('supervisor', 'หัวหน้างาน')}   value={machine.supervisorName} />
                <InfoRow label={tt('manager', 'ผู้จัดการ')}        value={machine.managerName} />
                <InfoRow label={tt('reset_period', 'รอบรีเซ็ต')}                value={machine.resetPeriod} />
                <InfoRow label={tt('maintenance_period', 'รอบบำรุงรักษา')}      value={machine.maintenancePeriod} />
                {isCalibration && <InfoRow label={tt('certificate_period', 'รอบสอบเทียบ')} value={machine.certificatePeriod} />}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Review + Warranty ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 font-semibold"><CalendarCheck className="h-5 w-5 text-primary" />{tt('monthly_review', 'การสุ่มตรวจ')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-4">
              <InfoRow label={tt('last_review', 'ตรวจล่าสุด')} value={formatDate(machine.lastReview)} />
              <InfoRow label={tt('review_by', 'ผู้ตรวจ')}      value={machine.reviewByName} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-primary" />{t('warranty')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <InfoRow label={t('warranty')} value={
                machine.hasWarranty === 'YES' ? <Badge className="bg-emerald-100 text-emerald-700">{t('yes')}</Badge>
                  : machine.hasWarranty === 'NO' ? <Badge className="bg-slate-100 text-slate-500">{t('no')}</Badge> : null} />
              {machine.hasWarranty === 'YES' && (
                <>
                  <InfoRow label={tt('warranty_expire_date', 'วันหมดประกัน')} value={formatDate(machine.warrantyExpireDate)} />
                  <InfoRow label={tt('warranty_note', 'รายละเอียดประกัน')}  value={machine.warrantyNote} />
                  <InfoRow label={t('attachments')} value={<FileList files={warrantyFiles} />} />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Work instruction ── */}
        {wiFiles.length > 0 && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 font-semibold"><FileText className="h-5 w-5 text-primary" />{tt('work_instruction', 'คู่มือการใช้งาน (WI)')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4"><FileList files={wiFiles} /></CardContent>
          </Card>
        )}

        {/* ── Maintenance records ── */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 font-semibold"><Wrench className="h-5 w-5 text-primary" />{t('maintenance_records')}
              <span className="text-sm font-normal text-muted-foreground">({maintenances.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {maintenances.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">{t('no_data_available')}</p> : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-left">{tt('years', 'ปี')}</th>
                    <th className="px-4 py-2.5 text-left">{t('round')}</th>
                    <th className="px-4 py-2.5 text-left">{t('due_date')}</th>
                    <th className="px-4 py-2.5 text-left">{t('plan_date')}</th>
                    <th className="px-4 py-2.5 text-left">{t('actual_date')}</th>
                    <th className="px-4 py-2.5 text-left">{t('responsible_by')}</th>
                    <th className="px-4 py-2.5 text-left">{tt('status', 'สถานะ')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {maintenances.map(m => (
                    <tr key={m.id} className={`hover:bg-muted/30 cursor-pointer ${m.isCanceled ? 'opacity-50 line-through' : ''}`}
                      onClick={() => router.navigate({ to: '/checklist/maintenance/view', search: { id: m.id } })}>
                      <td className="px-4 py-2.5">{m.years ?? '-'}</td>
                      <td className="px-4 py-2.5">{m.round ?? '-'}</td>
                      <td className="px-4 py-2.5">{formatDate(m.dueDate)}</td>
                      <td className="px-4 py-2.5">{formatDate(m.planDate)}</td>
                      <td className="px-4 py-2.5">{formatDate(m.actualDate)}</td>
                      <td className="px-4 py-2.5">{m.maintenanceBy || '-'}</td>
                      <td className="px-4 py-2.5">{m.isCanceled ? <Badge className="bg-zinc-100 text-zinc-500">CANCELED</Badge> : <StatusBadge value={m.status} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* ── Calibration records ── */}
        {(isCalibration || calibrations.length > 0) && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-primary" />{tt('calibration_records', 'ประวัติการสอบเทียบ')}
                <span className="text-sm font-normal text-muted-foreground">({calibrations.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {calibrations.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">{t('no_data_available')}</p> : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 text-left">{tt('years', 'ปี')}</th>
                      <th className="px-4 py-2.5 text-left">{t('due_date')}</th>
                      <th className="px-4 py-2.5 text-left">{t('start_date')}</th>
                      <th className="px-4 py-2.5 text-left">{tt('certificate_date', 'วันที่ออกใบรับรอง')}</th>
                      <th className="px-4 py-2.5 text-left">{tt('calibration_by', 'ผู้สอบเทียบ')}</th>
                      <th className="px-4 py-2.5 text-left">{tt('result', 'ผล')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {calibrations.map(c => (
                      <tr key={c.id} className={c.isCanceled ? 'opacity-50 line-through' : ''}>
                        <td className="px-4 py-2.5">{c.years ?? '-'}</td>
                        <td className="px-4 py-2.5">{formatDate(c.dueDate)}</td>
                        <td className="px-4 py-2.5">{formatDate(c.startDate)}</td>
                        <td className="px-4 py-2.5">{formatDate(c.certificateDate)}</td>
                        <td className="px-4 py-2.5">{c.calibrationBy || '-'}</td>
                        <td className="px-4 py-2.5">{c.result || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Cancel info + audit ── */}
        <Card>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            {machine.cancelDate && <InfoRow label={tt('cancel_date', 'วันที่ยกเลิก')} value={formatDate(machine.cancelDate)} />}
            {machine.reasonCancel && <InfoRow label={tt('reason_cancel', 'เหตุผลที่ยกเลิก')} value={machine.reasonCancel} />}
            <InfoRow label={tt('created_by', 'สร้างโดย')} value={`${memberName(machine.createdBy)} (${formatDate(machine.createdAt)})`} />
            <InfoRow label={tt('updated_by', 'แก้ไขล่าสุดโดย')} value={`${memberName(machine.updatedBy)} (${formatDate(machine.updatedAt)})`} />
          </CardContent>
        </Card>

      </div>
    </div>
  )
}