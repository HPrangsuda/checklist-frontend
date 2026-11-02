import { api } from '@/core/interceptor/api.interceptor'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getStatusColor } from '@/utils/status.untils'
import { ArrowLeft, CheckCircle2, ClipboardList, FileText, Gauge, Info, Wrench } from 'lucide-react'

// ─── Route ────────────────────────────────────────────────────────────────────

type ReviewEditSearch = { id: number }

export const Route = createFileRoute('/checklist/reviews/edit')({
  component: ReviewEdit,
  validateSearch: (search: Record<string, unknown>): ReviewEditSearch => ({
    id: Number(search.id) || 0,
  }),
  loaderDeps: ({ search: { id } }) => ({ id }),
  loader: async ({ deps: { id } }) => {
    const response = await api.get<any>(`/api/machine/${id}`)
    return { machineData: response?.data ?? null }
  },
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileEntry {
  fileName: string
  fileUrl:  string
  fileType: string
  fileSize: number
}

interface ChecklistRow {
  id:          number
  detail:      string
  description: string
  resetTime:   string
  isChoice:    boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp'])
const API_BASE   = import.meta.env.VITE_API_URL ?? ''

function toDateString(val: unknown): string {
  if (!val) return ''
  if (Array.isArray(val)) {
    const [y, m, d] = val as number[]
    if (!y || !m || !d) return ''
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  const str = String(val)
  return str.includes('T') ? str.split('T')[0] : str
}

function formatDate(val: unknown): string {
  const s = toDateString(val)
  if (!s) return '-'
  const [y, m, d] = s.split('-')
  return d && m && y ? `${d}/${m}/${y}` : s
}

function parseFiles(raw?: string | null | any[]): FileEntry[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter((f): f is FileEntry => !!f && typeof f.fileName === 'string')
  if (typeof raw === 'string') {
    try { return parseFiles(JSON.parse(raw)) } catch { return [] }
  }
  return []
}

const isImageFile = (fileName: string) =>
  IMAGE_EXTS.has(fileName.split('.').pop()?.toLowerCase() ?? '')

const toFileUrl = (fileUrl: string) => {
  const filename = fileUrl.split('/').pop() ?? fileUrl
  return `${API_BASE}/api/files/download/${encodeURIComponent(filename)}`
}

/** คืนค่าแรกที่ไม่ว่างจาก key ที่ระบุ (รองรับชื่อ field ที่ต่างกันระหว่าง DTO) */
const pick = (obj: any, ...keys: string[]) => {
  for (const k of keys) {
    const v = obj?.[k]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return null
}

const toChecklistRow = (item: any): ChecklistRow => ({
  id:          item.id,
  detail:      item.question?.detail      ?? '',
  description: item.question?.description ?? '',
  resetTime:   item.resetTime             ?? '',
  isChoice:    item.question?.isChoice    ?? item.isChoice ?? false,
})

// ─── Small components ─────────────────────────────────────────────────────────

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

  if (failed)   return <FileText className="h-6 w-6 text-muted-foreground" />
  if (!blobUrl) return <div className="w-full h-full animate-pulse bg-muted" />
  return <img src={blobUrl} alt={alt} className={className} />
}

function FileList({ label, files }: { label: string; files: FileEntry[] }) {
  const open = async (f: FileEntry) => {
    try {
      const res = await api.getInstance().get(toFileUrl(f.fileUrl || f.fileName), { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch {
      toast.error('โหลดไฟล์ไม่สำเร็จ')
    }
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {files.length === 0 ? (
        <p className="text-sm">-</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {files.map((f, i) => (
            <button
              key={f.fileName + i}
              type="button"
              title={f.fileName}
              onClick={() => open(f)}
              className="w-20 h-20 rounded-lg border bg-muted overflow-hidden hover:border-primary transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isImageFile(f.fileName) ? (
                <AuthImage src={toFileUrl(f.fileUrl || f.fileName)} alt={f.fileName} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 p-1">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground leading-tight line-clamp-2 break-all">{f.fileName}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, children, wide }: { label: string; children?: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2 lg:col-span-3' : ''}>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <div className="text-sm break-words whitespace-pre-line">{children || '-'}</div>
    </div>
  )
}

function SectionCard({ icon, title, subtitle, children }: {
  icon:      ReactNode
  title:     string
  subtitle?: string
  children:  ReactNode
}) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b bg-muted/30">
        <div className="p-1.5 rounded-md bg-background border shrink-0">{icon}</div>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  )
}

function ChecklistTable({ items, loading }: { items: ChecklistRow[]; loading: boolean }) {
  if (loading) return <div className="text-sm text-muted-foreground py-6 text-center">กำลังโหลด...</div>
  if (items.length === 0)
    return <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">ยังไม่มีคำถามในรายการ</div>

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Detail</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-[26%]">Description</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-[14%]">Reset Time</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-[10%]">Type</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map(item => (
            <tr key={item.id}>
              <td className="px-4 py-2.5 font-medium"><span className="line-clamp-2">{item.detail}</span></td>
              <td className="px-4 py-2.5 text-muted-foreground"><span className="line-clamp-2">{item.description || '-'}</span></td>
              <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{item.resetTime || '-'}</td>
              <td className="px-4 py-2.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  item.isChoice ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {item.isChoice ? 'Choice' : 'Text'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function ReviewEdit() {
  const navigate         = useNavigate()
  const { machineData: m } = Route.useLoaderData()
  const { id }           = Route.useSearch()

  const [checklists,       setChecklists]       = useState<ChecklistRow[]>([])
  const [maintChecklists,  setMaintChecklists]  = useState<ChecklistRow[]>([])
  const [checklistLoading, setChecklistLoading] = useState(true)
  const [submitting,       setSubmitting]       = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    if (!m?.machineCode) { setChecklistLoading(false); return }
    const params = { machineCode: m.machineCode }
    Promise.allSettled([
      api.getInstance().get<any>('/api/machine-checklist/by-machine',     { params }),
      api.getInstance().get<any>('/api/maintenance-checklist/by-machine', { params }),
    ]).then(([c, mc]) => {
      if (c.status === 'fulfilled') setChecklists((c.value.data?.data ?? []).map(toChecklistRow))
      else toast.error('โหลด checklist ไม่สำเร็จ')
      if (mc.status === 'fulfilled') setMaintChecklists((Array.isArray(mc.value.data) ? mc.value.data : []).map(toChecklistRow))
      else toast.error('โหลด maintenance checklist ไม่สำเร็จ')
    }).finally(() => setChecklistLoading(false))
  }, [m?.machineCode])

  if (!m) {
    return (
      <main className="container mx-auto px-4 py-8">
        <Card className="p-10 text-center space-y-4">
          <p className="text-sm text-muted-foreground">ไม่พบข้อมูลเครื่องจักร</p>
          <Button variant="outline" size="sm" onClick={() => navigate({ to: '/checklist/reviews' })}>
            กลับไปหน้ารายการสุ่มตรวจ
          </Button>
        </Card>
      </main>
    )
  }

  const images       = parseFiles(m.image)
  const instructions = parseFiles(m.workInstruction)
  const maintRecords = [...(m.maintenanceRecords ?? [])].sort((a: any, b: any) => (a.round ?? 0) - (b.round ?? 0))
  const calRecords   = m.calibrationRecords ?? []
  const cal          = calRecords.find((c: any) => !c.isCanceled) ?? calRecords[0] ?? null
  const reviewedThisYear = toDateString(m.lastReview).startsWith(String(new Date().getFullYear()))

  const handleReview = async () => {
    setSubmitting(true)
    try {
      const res = await api.post<any>(`/api/machine/${id}/review`)
      if (res?.success === false) throw new Error(res?.message)
      toast.success('บันทึกการตรวจสอบแล้ว')
      setTimeout(() => navigate({ to: '/checklist/reviews' }), 800)
    } catch (e: any) {
      toast.error('บันทึกการตรวจสอบไม่สำเร็จ', { description: e?.response?.data?.message || e?.message })
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-6 max-w-5xl">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="กลับ"
              onClick={() => navigate({ to: '/checklist/reviews' })}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight">{m.machineCode}</h1>
              <p className="text-sm text-muted-foreground truncate">{m.machineName}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                {reviewedThisYear
                  ? <Badge className="bg-emerald-100 text-emerald-700">ตรวจสอบแล้วปีนี้</Badge>
                  : <Badge className="bg-amber-100 text-amber-700">ยังไม่ตรวจสอบปีนี้</Badge>}
                <span className="text-muted-foreground">
                  ล่าสุด {formatDate(m.lastReview)} {m.reviewByName ? `โดย ${m.reviewByName}` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Card 1: ข้อมูลทั่วไป ── */}
        <SectionCard icon={<Info className="w-4 h-4 text-red-600" />} title="ข้อมูลทั่วไป">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            <Field label="ชื่อเครื่อง">{m.machineName}</Field>
            <Field label="รหัสเครื่อง">{m.machineCode}</Field>
            <Field label="Serial number">{m.serialNumber}</Field>
            <Field label="ยี่ห้อ">{m.brand}</Field>
            <Field label="รุ่น">{m.model}</Field>
            <Field label="เครื่องใหม่">{m.isNew === true ? 'ใช่' : m.isNew === false ? 'ไม่ใช่' : null}</Field>
            <Field label="กลุ่มเครื่อง">{m.machineGroupName}</Field>
            <Field label="ประเภทเครื่อง">{m.machineTypeName}</Field>
            <Field label="แผนก">{m.departmentName || m.department}</Field>
            <Field label="ผู้รับผิดชอบ">{m.responsiblePersonName}</Field>
            <Field label="หัวหน้างาน">{m.supervisorName}</Field>
            <Field label="ผู้จัดการ">{m.managerName}</Field>
            <Field label="สถานะเครื่อง">
              {m.machineStatus && <Badge className={getStatusColor(m.machineStatus)}>{m.machineStatus}</Badge>}
            </Field>
            <Field label="สถานะการเช็ค">
              {m.checkStatus && <Badge className={getStatusColor(m.checkStatus)}>{m.checkStatus}</Badge>}
            </Field>
            <Field label="Reset period">{m.resetPeriod}</Field>
            {m.reasonCancel && <Field label="เหตุผลที่ยกเลิก" wide>{m.reasonCancel}</Field>}
            <Field label="หมายเหตุ" wide>{m.note}</Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-5 border-t">
            <FileList label="รูปภาพ" files={images} />
            <FileList label="Work instruction" files={instructions} />
          </div>
        </SectionCard>

        {/* ── Card 2: Checklist ── */}
        <SectionCard
          icon={<ClipboardList className="w-4 h-4 text-blue-600" />}
          title="Checklist"
          subtitle={checklistLoading ? undefined : `${checklists.length} คำถาม`}
        >
          <ChecklistTable items={checklists} loading={checklistLoading} />
        </SectionCard>

        {/* ── Card 3: Maintenance ── */}
        <SectionCard
          icon={<Wrench className="w-4 h-4 text-amber-600" />}
          title="Maintenance"
          subtitle={m.maintenancePeriod ? `รอบการบำรุงรักษา ${m.maintenancePeriod}` : 'ยังไม่ได้กำหนดรอบการบำรุงรักษา'}
        >
          <div className="space-y-5">
            {maintRecords.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">ยังไม่มีแผนบำรุงรักษา</div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      {['รอบ', 'ปี', 'กำหนด', 'วันที่วางแผน', 'วันที่ทำจริง', 'สถานะ', 'ผู้ดำเนินการ'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {maintRecords.map((r: any, i: number) => (
                      <tr key={r.id ?? i} className={r.isCanceled ? 'opacity-50 line-through' : ''}>
                        <td className="px-4 py-2.5 font-medium">{r.round ?? '-'}</td>
                        <td className="px-4 py-2.5">{r.years ?? '-'}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(r.dueDate)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(r.planDate)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(r.actualDate)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">{r.isCanceled ? 'ยกเลิก' : (r.status ?? '-')}</td>
                        <td className="px-4 py-2.5">{r.maintenanceBy ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Maintenance checklist</p>
              <ChecklistTable items={maintChecklists} loading={checklistLoading} />
            </div>
          </div>
        </SectionCard>

        {/* ── Card 4: Calibration ── */}
        <SectionCard
          icon={<Gauge className="w-4 h-4 text-violet-600" />}
          title="Calibration"
          subtitle={calRecords.length ? `ประวัติทั้งหมด ${calRecords.length} รายการ แสดงรายการล่าสุด` : undefined}
        >
          {!cal ? (
            <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">ยังไม่มีข้อมูลสอบเทียบ</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="วันครบกำหนด">{formatDate(pick(cal, 'calibrationDueDate', 'dueDate'))}</Field>
              <Field label="วันที่ออกใบรับรอง">{formatDate(cal.certificateDate)}</Field>
              <Field label="ผลการสอบเทียบ">{pick(cal, 'result', 'results')}</Field>
              <Field label="สถานะ">{pick(cal, 'calibrationStatus', 'status')}</Field>
              <Field label="ผู้สอบเทียบ">{cal.calibrationBy}</Field>
              <Field label="ช่วงการวัด">{pick(cal, 'measurementRange', 'measuringRange')}</Field>
              <Field label="ช่วงสอบเทียบ">{cal.calibrationRange}</Field>
              <Field label="MPE">{cal.mpe}</Field>
              <Field label="Resolution">{cal.resolution}</Field>
              <Field label="มาตรฐานอ้างอิง">{cal.referStandard}</Field>
              <Field label="เกณฑ์">{cal.criteria}</Field>
              <Field label="ความแม่นยำ">{cal.accuracy}</Field>
              <Field label="หมายเหตุ" wide>{cal.remark}</Field>
            </div>
          )}
        </SectionCard>

        {/* ── Footer action: แสดงเฉพาะเครื่องที่ยังไม่ถูกตรวจในปีนี้ ── */}
        {!reviewedThisYear && (
          <div className="flex justify-end pt-2 pb-8">
            <Button onClick={handleReview} disabled={submitting}>
              {submitting
                ? <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                : <CheckCircle2 className="w-4 h-4 mr-2" />}
              ตรวจสอบแล้ว
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}