import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { createFileRoute, useRouter, useSearch } from '@tanstack/react-router'
import { ArrowLeft, Edit3, Info, PencilRuler, Wrench, Download, FileText, X, ClipboardList } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
import { toast } from 'sonner'
import { MaintenanceTbl } from '@/module/checklist/maintenance/history-table'
import { CalibrationTbl } from '@/module/checklist/calibration/history-table'
import { ChecklistTab } from '@/module/checklist/machine/checklist-tab'
import { MaintenanceChecklistTab } from '@/module/checklist/machine/maintenance-checklist-tab'

export const Route = createFileRoute('/checklist/machine/view')({
  component: MachineView,
  validateSearch: (search: Record<string, unknown>) => ({
    id: Number(search.id) || 0
  })
})

// ─── Types — ตรงกับ MachineResponseDTO ───────────────────────────────────────

interface MachineResponseDTO {
  id:                   number
  machineCode:          string
  machineName:          string
  machineGroupId?:      string
  machineGroupName?:    string
  machineTypeId?:       string
  machineTypeName?:     string
  machineStatus:        string
  checkStatus:          string
  model?:               string
  brand?:               string
  serialNumber?:        string
  businessUnit?:        string
  department?:          string
  departmentName?:      string
  registerId?:          string
  registerDate?:        string
  cancelDate?:          string
  reasonCancel?:        string
  isCalibration?:       boolean
  certificatePeriod?:   string
  maintenancePeriod?:   string
  image?:               string
  machineNumber?:       string
  qrCode?:              string
  resetPeriod?:         string
  note?:                string
  responsiblePersonId?:   number
  responsiblePersonName?: string
  supervisorId?:          number
  supervisorName?:        string
  managerId?:             number
  managerName?:           string
  workInstruction?:     string
  lastReview?:          string
  reviewBy?:            string
  createdBy?:           { id: number; firstName: string; lastName: string }
  updatedBy?:           { id: number; firstName: string; lastName: string }
  calibrationRecords?:  any[]
  maintenanceRecords?:  any[]
}

interface AttachmentItem {
  fileName:   string
  fileUrl:    string
  fileType:   string
  fileSize:   number
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

const parseFiles = (raw?: string | null): AttachmentItem[] => {
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

function AttachmentList({ raw, label }: { raw?: string | null; label: string }) {
  const files = parseFiles(raw)
  if (files.length === 0) return null
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-3">{label}</p>
      <div className="flex flex-wrap gap-3">
        {files.map((f, i) => <AttachmentFile key={i} file={f} />)}
      </div>
    </div>
  )
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value, className = '' }: {
  label: string; value?: string | number | null; className?: string
}) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base mt-1">{value || '-'}</p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function MachineView() {
  const { id } = useSearch({ from: '/checklist/machine/view' })
  const { t }  = useTranslation('checklist')
  const router = useRouter()

  const [machine,   setMachine]   = useState<MachineResponseDTO | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => { if (id) fetchMachineDetail() }, [id])

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

  const getStatusLabel = (status?: string) => {
    if (!status) return '-'
    const key = `status_${status.toLowerCase().replace(/\s+/g, '_')}`
    const translated = t(key)
    return translated !== key ? translated : status
  }

  const fetchMachineDetail = async () => {
    try {
      setLoading(true)
      const response = await api.get<any>(`/api/machine/${id}`)
      if (response?.data) setMachine(response.data)
      else toast.error(t('failed_to_load_machine'))
    } catch {
      toast.error(t('failed_to_load_machine'))
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadQR = () => {
    if (!machine?.qrCode) { toast.error(t('qr_not_available')); return }
    const a = document.createElement('a')
    a.href = machine.qrCode
    a.download = `QR_${machine.machineCode}.png`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    toast.success(t('qr_downloaded'))
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Skeleton className="h-12 w-64 mb-4" />
      <Skeleton className="h-96 w-full" />
    </div>
  )

  if (!machine) return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-4">{t('machine_not_found')}</p>
          <Button onClick={() => router.navigate({ to: '/checklist/machine' })}>
            <ArrowLeft className="mr-2 h-4 w-4" />{t('back_to_list')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.navigate({ to: '/checklist/machine' })}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{machine.machineName}</h1>
              <p className="text-sm text-muted-foreground">{machine.machineCode}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(machine.machineStatus)}>
              {getStatusLabel(machine.machineStatus)}
            </Badge>
            <Badge className={getStatusColor(machine.checkStatus)}>
              {getStatusLabel(machine.checkStatus)}
            </Badge>
            <Button variant="outline" size="sm"
              onClick={() => router.navigate({ to: '/checklist/machine/edit', search: { id } })}>
              <Edit3 className="h-4 w-4 mr-2" />{t('edit')}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full max-w-xl">
            <TabsTrigger value="general"     className="flex items-center gap-2">
              <Info className="h-4 w-4" />{t('general') ?? 'General'}
            </TabsTrigger>
            <TabsTrigger value="checklist"   className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />Checklist
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />{t('maintenance')}
            </TabsTrigger>
            <TabsTrigger value="calibration" className="flex items-center gap-2">
              <PencilRuler className="h-4 w-4" />{t('calibration')}
            </TabsTrigger>
          </TabsList>

          {/* ── General ───────────────────────────────────────────────────── */}
          <TabsContent value="general" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="font-semibold">{t('basic_information')}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <InfoRow label={t('machine_code')}    value={machine.machineCode} />
                <InfoRow label={t('machine_name')}    value={machine.machineName} />
                <InfoRow label={t('brand')}           value={machine.brand} />
                <InfoRow label={t('model')}           value={machine.model} />
                <InfoRow label={t('serial_number')}   value={machine.serialNumber} />
                <InfoRow label={t('department')}      value={machine.departmentName || machine.department} />
                <InfoRow label={t('machine_group')}   value={machine.machineGroupName || machine.machineGroupId} />
                <InfoRow label={t('machine_type')}    value={machine.machineTypeName  || machine.machineTypeId} />
                <InfoRow label={t('responsible')}     value={machine.responsiblePersonName} />
                <InfoRow label={t('supervisor')}      value={machine.supervisorName} />
                <InfoRow label={t('manager')}         value={machine.managerName} />
                <InfoRow label={t('reset_period')}    value={machine.resetPeriod} />
                <InfoRow label={t('maintenance_period')} value={machine.maintenancePeriod} />
                <InfoRow label={t('note')}            value={machine.note} />
              </CardContent>
            </Card>

            {/* QR Code */}
            {machine.qrCode && (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="font-semibold">{t('qr_code')}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4 pt-4">
                  <div className="border rounded-lg p-4 bg-white shadow-sm">
                    <img src={machine.qrCode} alt={`QR ${machine.machineCode}`} className="w-[200px] h-auto" />
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadQR}>
                    <Download className="h-4 w-4 mr-2" />{t('download')}
                  </Button>
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Images */}
  {parseFiles(machine.image).length > 0 && (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="font-semibold">{t('machine_image')}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <AttachmentList raw={machine.image} label={t('machine_image')} />
      </CardContent>
    </Card>
  )}

  {/* Work Instructions */}
  {parseFiles(machine.workInstruction).length > 0 && (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="font-semibold">{t('work_instructions')}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <AttachmentList raw={machine.workInstruction} label={t('work_instructions')} />
      </CardContent>
    </Card>
  )}
</div>
            
          </TabsContent>

          {/* ── Checklist ─────────────────────────────────────────────────── */}
          <TabsContent value="checklist" className="mt-4">
            <ChecklistTab machineCode={machine.machineCode} />
          </TabsContent>

          {/* ── Maintenance ───────────────────────────────────────────────── */}
          <TabsContent value="maintenance" className="mt-4 space-y-4">
            <MaintenanceTbl machineCode={machine.machineCode} />
            <MaintenanceChecklistTab machineCode={machine.machineCode} />
          </TabsContent>

          {/* ── Calibration ───────────────────────────────────────────────── */}
          <TabsContent value="calibration" className="mt-4">
            <CalibrationTbl machineCode={machine.machineCode} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}