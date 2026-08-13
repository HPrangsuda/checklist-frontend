import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
import {
  PencilRuler, X, CalendarDays, CheckCircle2, Clock,
  User, CircleDashed, PlayCircle, CheckCircle, AlertCircle, Search, Pencil, Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { useDebounce } from '@/core/hooks/use-debounce'
import { useRouter } from '@tanstack/react-router'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalibrationDTO {
  id: number
  machineCode: string
  machineName: string
  years: string           
  dueDate: string
  startDate: string
  certificateDate: string
  results: string
  calibrationStatus: string
  responsibleMaintenanceName: string
  machineDepartmentCode: string
  machineDepartmentName: string
  note: string
  attachment: string
}

type ColumnKey = 'todo' | 'inprogress' | 'done'

interface KanbanColumn {
  key: ColumnKey
  labelKey: string
  icon: React.ReactNode
  headerClass: string
  dotClass: string
  cardClass: string
  rows: CalibrationDTO[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtDate(d: Date | null): string {
  if (!d) return '-'
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}

function diffDays(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

function getColumnKey(row: CalibrationDTO): ColumnKey {
  if (row.certificateDate) return 'done'
  if (row.startDate)       return 'inprogress'
  return 'todo'
}

// ─── Timeliness badge ─────────────────────────────────────────────────────────

function TimelinessTag({ row, t }: { row: CalibrationDTO; t: (k: string) => string }) {
  const due  = parseDate(row.dueDate)
  const cert = parseDate(row.certificateDate)
  const today = new Date(); today.setHours(0, 0, 0, 0)

  if (!due) return null

  if (cert) {
    const late = diffDays(cert, due)
    if (late <= 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="w-2.5 h-2.5" />{t('on_time')}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
        <AlertCircle className="w-2.5 h-2.5" />{t('overdue')} +{late}d
      </span>
    )
  }

  const late = diffDays(today, due)
  if (late > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
        <AlertCircle className="w-2.5 h-2.5" />{t('overdue')} +{late}d
      </span>
    )
  }
  if (late === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
        <Clock className="w-2.5 h-2.5" />Today
      </span>
    )
  }
  return null
}

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMN_CONFIG: Omit<KanbanColumn, 'rows'>[] = [
  {
    key:         'todo',
    labelKey:    'kanban_todo',
    icon:        <CircleDashed className="w-3.5 h-3.5" />,
    headerClass: 'bg-slate-50 border-slate-200 text-slate-700',
    dotClass:    'bg-slate-400',
    cardClass:   'border-slate-200 hover:border-slate-400',
  },
  {
    key:         'inprogress',
    labelKey:    'kanban_inprogress',
    icon:        <PlayCircle className="w-3.5 h-3.5" />,
    headerClass: 'bg-blue-50 border-blue-200 text-blue-700',
    dotClass:    'bg-blue-500',
    cardClass:   'border-blue-200 hover:border-blue-400',
  },
  {
    key:         'done',
    labelKey:    'done',
    icon:        <CheckCircle className="w-3.5 h-3.5" />,
    headerClass: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    dotClass:    'bg-emerald-500',
    cardClass:   'border-emerald-200 hover:border-emerald-400',
  },
]

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function DetailDrawer({ row, onClose }: { row: CalibrationDTO | null; onClose: () => void }) {
  const { t }  = useTranslation('checklist')
  const router = useRouter()
  const ref    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!row) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [row, onClose])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const start = parseDate(row?.startDate)
  const cert  = parseDate(row?.certificateDate)
  const due   = parseDate(row?.dueDate)
  const col   = COLUMN_CONFIG.find(c => c.key === (row ? getColumnKey(row) : 'todo'))

  const timelineRows = [
    { icon: <CalendarDays className="w-3.5 h-3.5 text-red-500" />,                                                labelKey: 'due_date',         value: fmtDate(due),   hl: false,   hlClass: '' },
    { icon: <PlayCircle   className={`w-3.5 h-3.5 ${start ? 'text-blue-500'    : 'text-muted-foreground'}`} />,  labelKey: 'start_date',       value: fmtDate(start), hl: !!start, hlClass: 'text-blue-600' },
    { icon: <CheckCircle2 className={`w-3.5 h-3.5 ${cert  ? 'text-emerald-500' : 'text-muted-foreground'}`} />,  labelKey: 'certificate_date', value: fmtDate(cert),  hl: !!cert,  hlClass: 'text-emerald-600' },
  ]

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 ${row ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t('calibration_details')}
        className={`fixed top-0 right-0 z-50 h-full w-80 bg-background border-l border-border shadow-xl flex flex-col transition-transform duration-200 ease-in-out ${row ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <PencilRuler className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium">{t('calibration')}</span>
          </div>
          <div className="flex items-center gap-1">
            {row && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => router.navigate({ to: '/checklist/calibration/view', search: { id: row.id } })}
                  aria-label={t('view_document')}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => router.navigate({ to: '/checklist/calibration/edit', search: { id: row.id } })}
                  aria-label={t('edit')}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label={t('back_to_list')}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {row && (
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {/* Identity */}
            <div className={`rounded-lg px-4 py-3 border bg-white dark:bg-muted/20 ${col?.cardClass ?? ''}`}>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{t('machine_code')}</p>
              <p className="text-base font-semibold leading-tight">{row.machineCode}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{row.machineName}</p>
              {(row.machineDepartmentName || row.machineDepartmentCode) && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {t('department')}: <span className="font-medium text-foreground">{row.machineDepartmentName || row.machineDepartmentCode}</span>
                </p>
              )}
            </div>

            {/* Stage + timeliness badge */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${col?.headerClass}`}>
                {col?.icon}
                {t(col?.labelKey ?? '')}
              </div>
              <TimelinessTag row={row} t={t} />
            </div>

            {/* Year */}
            <p className="text-xs text-muted-foreground">{t('years')} {row.years}</p>

            {/* Timeline */}
            <div className="space-y-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Timeline</p>
              <div className="space-y-2.5">
                {timelineRows.map(({ icon, labelKey, value, hl, hlClass }) => (
                  <div key={labelKey} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">{icon}{t(labelKey)}</div>
                    <span className={`text-xs font-medium ${hl ? hlClass : 'text-foreground'}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Results */}
            {row.results && (
              <div className="rounded-md bg-muted px-3 py-2.5 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">
                  {t('results')}: <span className="font-medium text-foreground">{row.results}</span>
                </span>
              </div>
            )}

            {/* Responsible person */}
            {row.responsibleMaintenanceName && (
              <div className="space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{t('responsible_by')}</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">{row.responsibleMaintenanceName}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ─── CalibrationCard ──────────────────────────────────────────────────────────

function CalibrationCard({
  row, colConfig, selected, onClick, t,
}: {
  row: CalibrationDTO
  colConfig: Omit<KanbanColumn, 'rows'>
  selected: boolean
  onClick: () => void
  t: (key: string) => string
}) {
  const due    = parseDate(row.dueDate)
  const cert   = parseDate(row.certificateDate)
  const today  = new Date(); today.setHours(0, 0, 0, 0)

  const isOverdue       = !cert && due && due < today
  const responsibleName = row.responsibleMaintenanceName || null
  const deptLabel       = row.machineDepartmentName || row.machineDepartmentCode || null

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border px-3 py-2.5 space-y-2 transition-all bg-white dark:bg-muted/20
        ${colConfig.cardClass}
        ${selected ? 'ring-2 ring-offset-1 shadow-md' : 'hover:shadow-sm'}
        ${isOverdue ? '!border-red-300 bg-red-50/50 dark:bg-red-950/20' : ''}
      `}
    >
      {/* Code - Name + dot */}
      <div className="flex items-center justify-between gap-1">
        <p className="text-[11px] font-semibold">{row.machineCode} - {row.machineName}</p>
        <span className={`w-2 h-2 rounded-full shrink-0 ${isOverdue ? 'bg-red-500' : colConfig.dotClass}`} />
      </div>

      {/* Responsible person */}
      {responsibleName && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <User className="w-2.5 h-2.5 shrink-0" />
          <span className="truncate">{responsibleName}</span>
        </div>
      )}

      {/* Department badge + Timeliness badge + year · due date */}
      <div className="flex items-center justify-between gap-1 pt-0.5 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {deptLabel && (
            <span className="inline-flex items-center text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {deptLabel}
            </span>
          )}
          <TimelinessTag row={row} t={t} />
        </div>
        <span className="text-[10px] text-muted-foreground ml-auto">{row.years} · {fmtDate(due)}</span>
      </div>
    </button>
  )
}

// ─── KanbanColumnView ─────────────────────────────────────────────────────────

function KanbanColumnView({
  col, selectedUid, onSelect, t,
}: {
  col: KanbanColumn
  selectedUid: string | null
  onSelect: (row: CalibrationDTO) => void
  t: (key: string) => string
}) {
  return (
    <div className="flex flex-col rounded-xl border flex-1 min-w-0 bg-muted/30">
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl border-b ${col.headerClass}`}>
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {col.icon}
          {t(col.labelKey)}
        </div>
        <span className="text-xs font-medium opacity-70">{col.rows.length}</span>
      </div>

      <div className="flex flex-col gap-2 p-2.5 overflow-y-auto" style={{ maxHeight: 480 }}>
        {col.rows.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-6">{t('no_result')}</p>
        ) : (
          col.rows.map(row => {
            const uid = `${row.id}`
            return (
              <CalibrationCard
                key={uid}
                row={row}
                colConfig={col}
                selected={selectedUid === uid}
                onClick={() => onSelect(row)}
                t={t}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── CalibrationKanbanCard ────────────────────────────────────────────────────

export function CalibrationKanbanCard() {
  const { t } = useTranslation('checklist')
  const [data, setData]         = useState<CalibrationDTO[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<CalibrationDTO | null>(null)
  const [keyword, setKeyword]   = useState('')
  const debouncedKeyword        = useDebounce(keyword, 400)

  useEffect(() => { fetchData(debouncedKeyword) }, [debouncedKeyword])

  const fetchData = async (kw: string) => {
    try {
      setLoading(true)
      const params: Record<string, unknown> = { index: 0, size: 200 }
      if (kw.trim()) params.keyword = kw.trim()
      const response = await api.get('/api/calibration/get/page', { params })
      if (response?.success) setData(response.data ?? [])
      else toast.error(response?.message ?? t('data_fetch_failed'))
    } catch {
      toast.error(t('data_fetch_failed'))
    } finally {
      setLoading(false)
    }
  }

  const columns: KanbanColumn[] = useMemo(() => {
    const buckets: Record<ColumnKey, CalibrationDTO[]> = { todo: [], inprogress: [], done: [] }
    data.forEach(row => { buckets[getColumnKey(row)].push(row) })

    const sortByDueAsc = (arr: CalibrationDTO[]) =>
      [...arr].sort((a, b) => {
        const da = parseDate(a.dueDate), db = parseDate(b.dueDate)
        if (!da && !db) return 0
        if (!da) return 1
        if (!db) return -1
        return da.getTime() - db.getTime()
      })

    const sortByCertDesc = (arr: CalibrationDTO[]) =>
      [...arr].sort((a, b) => {
        const da = parseDate(a.certificateDate), db = parseDate(b.certificateDate)
        if (!da && !db) return 0
        if (!da) return 1
        if (!db) return -1
        return db.getTime() - da.getTime()
      })

    return COLUMN_CONFIG.map(cfg => ({
      ...cfg,
      rows: cfg.key === 'done'
        ? sortByCertDesc(buckets[cfg.key])
        : sortByDueAsc(buckets[cfg.key]),
    }))
  }, [data])

  const selectedUid = selected ? `${selected.id}` : null

  const handleSelect = (row: CalibrationDTO) => {
    setSelected(prev => (prev?.id === row.id ? null : row))
  }

  const summary = useMemo(() => ({
    todo:       columns.find(c => c.key === 'todo')?.rows.length       ?? 0,
    inprogress: columns.find(c => c.key === 'inprogress')?.rows.length ?? 0,
    done:       columns.find(c => c.key === 'done')?.rows.length       ?? 0,
  }), [columns])

  return (
    <>
      <Card className="p-0 overflow-hidden gap-0 mb-4">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3 border-b px-5 py-4">
          <div>
            <CardTitle className="font-bold">
              <PencilRuler className="w-5 h-5 text-red-600 inline mr-2" />
              {t('calibration_lists')}
            </CardTitle>
            {!loading && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {t('total')} {data.length} ·
                <span className="text-slate-500"> {t('kanban_todo')} {summary.todo}</span> ·
                <span className="text-blue-500"> {t('kanban_inprogress')} {summary.inprogress}</span> ·
                <span className="text-emerald-600"> {t('done')} {summary.done}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder={t('search')}
                className="pl-8 h-8 text-xs w-48"
              />
              {keyword && (
                <button
                  onClick={() => setKeyword('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarDays className="w-3.5 h-3.5" />
              {t('kanban_sorted_by_due')}
            </div>
          </div>
        </CardHeader>

        <div className="flex gap-4 px-5 py-5 items-start">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="flex-1 h-72 rounded-xl bg-muted animate-pulse" />
            ))
          ) : (
            columns.map(col => (
              <KanbanColumnView
                key={col.key}
                col={col}
                selectedUid={selectedUid}
                onSelect={handleSelect}
                t={t}
              />
            ))
          )}
        </div>
      </Card>

      <DetailDrawer row={selected} onClose={() => setSelected(null)} />
    </>
  )
}