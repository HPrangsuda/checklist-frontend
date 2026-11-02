import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
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

const MAINTENANCE_PERIOD_KEYS: Record<string, string> = {
  '6 MONTH': 'maintenance_6_month',
  '3 MONTH': 'maintenance_3_month',
}

/** แทนค่า {key} ในข้อความแปล */
const fmt = (text: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), text)

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
  const { t } = useTranslation('checklist')

  const open = async (f: FileEntry) => {
    try {
      const res = await api.getInstance().get(toFileUrl(f.fileUrl || f.fileName), { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch {
      toast.error(t('review_file_load_failed'))
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
  const { t } = useTranslation('checklist')

  if (loading) return <div className="text-sm text-muted-foreground py-6 text-center">{t('loading')}</div>
  if (items.length === 0)
    return <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">{t('no_checklist_items')}</div>

  const th = 'text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground'

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className={th}>{t('question_detail')}</th>
            <th className={`${th} w-[26%]`}>{t('question_description')}</th>
            <th className={`${th} w-[14%] whitespace-nowrap`}>{t('review_reset_time')}</th>
            <th className={`${th} w-[10%]`}>{t('review_type')}</th>
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
                  {item.isChoice ? t('review_type_choice') : t('review_type_text')}
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
  const { t }              = useTranslation('checklist')
  const navigate           = useNavigate()
  const { machineData: m } = Route.useLoaderData()
  const { id }             = Route.useSearch()

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
      else toast.error(t('review_checklist_load_failed'))
      if (mc.status === 'fulfilled') setMaintChecklists((Array.isArray(mc.value.data) ? mc.value.data : []).map(toChecklistRow))
      else toast.error(t('review_maint_checklist_load_failed'))
    }).finally(() => setChecklistLoading(false))
  }, [m?.machineCode])

  if (!m) {
    return (
      <main className="container mx-auto px-4 py-8">
        <Card className="p-10 text-center space-y-4">
          <p className="text-sm text-muted-foreground">{t('machine_not_found')}</p>
          <Button variant="outline" size="sm" onClick={() => navigate({ to: '/checklist/reviews' })}>
            {t('back_to_list')}
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

  const periodKey   = MAINTENANCE_PERIOD_KEYS[m.maintenancePeriod as string]
  const periodLabel = periodKey ? t(periodKey) : m.maintenancePeriod

  const lastReviewText = [
    fmt(t('review_last_reviewed'), { date: formatDate(m.lastReview) }),
    m.reviewByName ? fmt(t('review_by_name'), { name: m.reviewByName }) : '',
  ].filter(Boolean).join(' ')

  const handleReview = async () => {
    setSubmitting(true)
    try {
      const res = await api.post<any>(`/api/machine/${id}/review`)
      if (res?.success === false) throw new Error(res?.message)
      toast.success(t('review_marked'))
      setTimeout(() => navigate({ to: '/checklist/reviews' }), 800)
    } catch (e: any) {
      toast.error(t('review_mark_failed'), { description: e?.response?.data?.message || e?.message })
      setSubmitting(false)
    }
  }

  const maintHeaders = [
    t('round'), t('years'), t('due_date'), t('plan_date'), t('actual_date'), t('review_status'), t('maintenance_by'),
  ]

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-6 max-w-5xl">

        {/* ── Header ── */}
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={t('back_to_list')}
            onClick={() => navigate({ to: '/checklist/reviews' })}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight">{m.machineCode}</h1>
            <p className="text-sm text-muted-foreground truncate">{m.machineName}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
              {reviewedThisYear
                ? <Badge className="bg-emerald-100 text-emerald-700">{t('review_reviewed_this_year')}</Badge>
                : <Badge className="bg-amber-100 text-amber-700">{t('review_not_reviewed_this_year')}</Badge>}
              <span className="text-muted-foreground">{lastReviewText}</span>
            </div>
          </div>
        </div>

        {/* ── Card 1: ข้อมูลทั่วไป ── */}
        <SectionCard icon={<Info className="w-4 h-4 text-red-600" />} title={t('basic_information')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            <Field label={t('name')}>{m.machineName}</Field>
            <Field label={t('machine_code')}>{m.machineCode}</Field>
            <Field label={t('serial_number')}>{m.serialNumber}</Field>
            <Field label={t('brand')}>{m.brand}</Field>
            <Field label={t('model')}>{m.model}</Field>
            <Field label={t('is_new')}>
              {m.isNew === true ? t('is_new_yes') : m.isNew === false ? t('is_new_no') : null}
            </Field>
            <Field label={t('machine_group')}>{m.machineGroupName}</Field>
            <Field label={t('machine_type')}>{m.machineTypeName}</Field>
            <Field label={t('department')}>{m.departmentName || m.department}</Field>
            <Field label={t('responsible')}>{m.responsiblePersonName}</Field>
            <Field label={t('supervisor')}>{m.supervisorName}</Field>
            <Field label={t('manager')}>{m.managerName}</Field>
            <Field label={t('machine_status')}>
              {m.machineStatus && <Badge className={getStatusColor(m.machineStatus)}>{m.machineStatus}</Badge>}
            </Field>
            <Field label={t('check_status')}>
              {m.checkStatus && <Badge className={getStatusColor(m.checkStatus)}>{m.checkStatus}</Badge>}
            </Field>
            <Field label={t('reset_period')}>{m.resetPeriod}</Field>
            {m.reasonCancel && <Field label={t('reason_cancel')} wide>{m.reasonCancel}</Field>}
            <Field label={t('note')} wide>{m.note}</Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-5 border-t">
            <FileList label={t('images')} files={images} />
            <FileList label={t('work_instructions')} files={instructions} />
          </div>
        </SectionCard>

        {/* ── Card 2: Checklist ── */}
        <SectionCard
          icon={<ClipboardList className="w-4 h-4 text-blue-600" />}
          title={t('review_checklist')}
          subtitle={checklistLoading ? undefined : fmt(t('review_question_count'), { count: checklists.length })}
        >
          <ChecklistTable items={checklists} loading={checklistLoading} />
        </SectionCard>

        {/* ── Card 3: Maintenance ── */}
        <SectionCard
          icon={<Wrench className="w-4 h-4 text-amber-600" />}
          title={t('maintenance')}
          subtitle={periodLabel
            ? fmt(t('review_maintenance_period'), { period: periodLabel })
            : t('review_no_maintenance_period')}
        >
          <div className="space-y-5">
            {maintRecords.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
                {t('review_no_maintenance_plan')}
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      {maintHeaders.map(h => (
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
                        <td className="px-4 py-2.5 whitespace-nowrap">{r.isCanceled ? t('canceled') : (r.status ?? '-')}</td>
                        <td className="px-4 py-2.5">{r.maintenanceBy ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t('review_maintenance_checklist')}</p>
              <ChecklistTable items={maintChecklists} loading={checklistLoading} />
            </div>
          </div>
        </SectionCard>

        {/* ── Card 4: Calibration ── */}
        <SectionCard
          icon={<Gauge className="w-4 h-4 text-violet-600" />}
          title={t('calibration')}
          subtitle={calRecords.length ? fmt(t('review_calibration_history'), { count: calRecords.length }) : undefined}
        >
          {!cal ? (
            <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
              {t('review_no_calibration')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <Field label={t('calibration_due_date')}>{formatDate(pick(cal, 'calibrationDueDate', 'dueDate'))}</Field>
              <Field label={t('certificate_date')}>{formatDate(cal.certificateDate)}</Field>
              <Field label={t('result')}>{pick(cal, 'result', 'results')}</Field>
              <Field label={t('calibration_status')}>{pick(cal, 'calibrationStatus', 'status')}</Field>
              <Field label={t('calibration_by')}>{cal.calibrationBy}</Field>
              <Field label={t('measurement_range')}>{pick(cal, 'measurementRange', 'measuringRange')}</Field>
              <Field label={t('calibration_range')}>{cal.calibrationRange}</Field>
              <Field label={t('mpe')}>{cal.mpe}</Field>
              <Field label={t('resolution')}>{cal.resolution}</Field>
              <Field label={t('refer_standard')}>{cal.referStandard}</Field>
              <Field label={t('criteria')}>{cal.criteria}</Field>
              <Field label={t('accuracy')}>{cal.accuracy}</Field>
              <Field label={t('remark')} wide>{cal.remark}</Field>
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
              {t('review_mark_reviewed')}
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}