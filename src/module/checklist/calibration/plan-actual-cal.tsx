import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarCheck, DatabaseZap, ChevronDown, ChevronRight, User } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from '@/core/contexts/language-context'
import { api } from '@/core/interceptor/api.interceptor'
import { toast } from 'sonner'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ResponsibleSummary {
  memberId:     number | null
  memberName:   string
  totalPlan:    number
  totalOnTime:  number   // certificate_date IS NOT NULL AND certificate_date <= due_date
  totalOverdue: number   // (certificate_date > due_date) OR certificate_date IS NULL
}

interface MonthlySummary {
  year:           number
  month:          number
  totalPlan:      number
  totalOnTime:    number
  totalOverdue:   number
  byResponsible:  ResponsibleSummary[]
}

interface ChartRow {
  label:   string
  plan:    number
  onTime:  number
  overdue: number
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────

function PlanActualTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded border bg-background px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="leading-5">
          {p.name}: <span className="font-medium">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function buildEmpty12(year: number): MonthlySummary[] {
  return Array.from({ length: 12 }, (_, i) => ({
    year, month: i + 1,
    totalPlan: 0, totalOnTime: 0, totalOverdue: 0,
    byResponsible: [],
  }))
}

function onTimeColor(pct: number) {
  if (pct >= 80) return 'text-emerald-600'
  if (pct >= 50) return 'text-amber-500'
  return 'text-red-500'
}

function onTimeBarColor(pct: number) {
  if (pct >= 80) return 'bg-emerald-500'
  if (pct >= 50) return 'bg-amber-400'
  return 'bg-red-400'
}

// ─── Sub-row: per-responsible breakdown ────────────────────────────────────────

function ResponsibleRows({ rows }: { rows: ResponsibleSummary[] }) {
  return (
    <div className="border-t bg-muted/20">
      {rows.map((r, i) => {
        const pct = r.totalPlan > 0 ? Math.round((r.totalOnTime / r.totalPlan) * 100) : 0
        return (
          <div
            key={r.memberId ?? i}
            className="grid grid-cols-[1.5rem_1fr_3.5rem_3.5rem_3.5rem] items-center gap-2 border-b px-5 py-1 last:border-0"
          >
            <span />
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-3 w-3 shrink-0 opacity-50" />
              <span className="truncate">{r.memberName}</span>
              <span className={`ml-1 text-[10px] font-medium ${onTimeColor(pct)}`}>{pct}%</span>
            </span>
            <span className="text-right text-blue-500">{r.totalPlan}</span>
            <span className="text-right text-emerald-500">{r.totalOnTime || '—'}</span>
            <span className={`text-right ${r.totalOverdue > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
              {r.totalOverdue || '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Month row (collapsible) ───────────────────────────────────────────────────

function MonthRow({
  row, label, expanded, onToggle,
}: {
  row: MonthlySummary
  label: string
  expanded: boolean
  onToggle: () => void
}) {
  const pct          = row.totalPlan > 0 ? Math.round((row.totalOnTime / row.totalPlan) * 100) : 0
  const hasBreakdown = row.byResponsible.length > 0

  return (
    <>
      <div
        className={`grid grid-cols-[3rem_1fr_3.5rem_3.5rem_3.5rem] items-center gap-2 border-b px-5 py-1.5
          ${hasBreakdown ? 'cursor-pointer hover:bg-muted/30' : ''}`}
        onClick={hasBreakdown ? onToggle : undefined}
      >
        <span className="flex items-center gap-1 font-medium text-muted-foreground">
          {hasBreakdown && (
            expanded
              ? <ChevronDown className="h-3 w-3" />
              : <ChevronRight className="h-3 w-3" />
          )}
          {label}
        </span>
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded bg-muted">
            <div
              className={`h-full rounded transition-all ${onTimeBarColor(pct)}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`w-8 text-right text-[10px] font-medium ${onTimeColor(pct)}`}>{pct}%</span>
        </div>
        <span className="text-right text-blue-600">{row.totalPlan}</span>
        <span className="text-right text-emerald-600">{row.totalOnTime || '—'}</span>
        <span className={`text-right ${row.totalOverdue > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
          {row.totalOverdue || '—'}
        </span>
      </div>
      {expanded && hasBreakdown && <ResponsibleRows rows={row.byResponsible} />}
    </>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function CalibrationPlanActualCard() {
  const { t } = useTranslation('checklist')

  const [allRows, setAllRows]   = useState<MonthlySummary[]>([])
  const [year, setYear]         = useState<number>(new Date().getFullYear())
  const [years, setYears]       = useState<number[]>([new Date().getFullYear()])
  const [loading, setLoading]   = useState(false)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const monthLabels = useMemo(
    () => [
      t('jan'), t('feb'), t('mar'), t('apr'), t('may_short'), t('jun'),
      t('jul'), t('aug'), t('sep'), t('oct'), t('nov'), t('dec'),
    ],
    [t],
  )

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/calibration/monthly-summary') as unknown
      const rows: MonthlySummary[] = res != null && typeof res === 'object' && !Array.isArray(res)
        ? Object.values(res as Record<string, MonthlySummary>)
        : Array.isArray(res) ? (res as MonthlySummary[]) : []

      setAllRows(rows)
      const distinct = [...new Set(rows.map(r => r.year).filter(y => y != null && !isNaN(y)))].sort() as number[]
      if (distinct.length) {
        setYears(distinct)
        setYear(distinct[distinct.length - 1])
      }
    } catch {
      toast.error(t('data_fetch_failed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchData() }, [fetchData])

  const monthly = useMemo(() => {
    const base = buildEmpty12(year)
    allRows
      .filter(r => r.year === year && r.year != null && r.month != null)
      .forEach(r => {
        const idx = r.month - 1
        if (idx >= 0 && idx < 12) base[idx] = r
      })
    return base
  }, [allRows, year])

  const chartRows: ChartRow[] = useMemo(() =>
    monthly.map((r, i) => ({
      label:   monthLabels[i],
      plan:    r.totalPlan,
      onTime:  r.totalOnTime,
      overdue: r.totalOverdue,
    })),
    [monthly, monthLabels],
  )

  const totalPlan    = monthly.reduce((s, r) => s + r.totalPlan,    0)
  const totalOnTime  = monthly.reduce((s, r) => s + r.totalOnTime,  0)
  const totalOverdue = monthly.reduce((s, r) => s + r.totalOverdue, 0)
  const onTimeRate   = totalPlan > 0 ? Math.round((totalOnTime / totalPlan) * 100) : null

  const COLORS = { plan: '#378ADD', onTime: '#1D9E75', overdue: '#E24B4A' }
  const legend = [
    { color: COLORS.plan,    key: 'plan_due_date'     },
    { color: COLORS.onTime,  key: 'completed_on_time' },
    { color: COLORS.overdue, key: 'overdue'           },
  ] as const

  const toggleMonth = (month: number) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(month) ? next.delete(month) : next.add(month)
      return next
    })

  return (
    <Card className="mb-4 mt-4 overflow-hidden p-0">

      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between border-b px-5 py-4">
        <CardTitle className="flex items-center gap-2 font-bold text-sm">
          <CalendarCheck className="h-5 w-5 text-blue-600" />
          {t('plan_vs_actual')}
        </CardTitle>
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
            {legend.map(({ color, key }) => (
              <span key={key} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
                {t(key)}
              </span>
            ))}
          </div>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="rounded border px-2 py-1 text-xs"
            aria-label={t('select_year')}
          >
            {years.map((y, i) => <option key={`year-${y}-${i}`} value={y}>{y}</option>)}
          </select>
        </div>
      </CardHeader>

      {/* Stat cards */}
      <div className="grid grid-cols-2 divide-x border-b sm:grid-cols-4">
        {[
          { label: t('total_planned'), value: totalPlan,    cls: '' },
          { label: t('completed'),     value: totalOnTime,  cls: 'text-emerald-600' },
          { label: t('overdue'),       value: totalOverdue, cls: totalOverdue > 0 ? 'text-red-500' : '' },
          { label: t('on_time_rate'),  value: onTimeRate != null ? `${onTimeRate}%` : '—',
            cls: onTimeRate != null
              ? onTimeRate >= 80 ? 'text-emerald-600'
              : onTimeRate >= 50 ? 'text-amber-500'
              : 'text-red-500' : '' },
        ].map(s => (
          <div key={s.label} className="bg-muted/30 py-3 text-center">
            <p className="mb-0.5 text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-medium ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="px-5 py-4">
        {loading ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            {t('loading')}
          </div>
        ) : totalPlan === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <DatabaseZap className="h-8 w-8 opacity-30" />
            {t('no_data_for_year')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartRows} barCategoryGap="30%" barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<PlanActualTooltip />} cursor={{ fill: 'rgba(128,128,128,0.06)' }} />
              <Bar dataKey="plan"    name={t('plan_due_date')}     fill={COLORS.plan}    radius={[3,3,0,0]} maxBarSize={18} />
              <Bar dataKey="onTime"  name={t('completed_on_time')} fill={COLORS.onTime}  radius={[3,3,0,0]} maxBarSize={18} />
              <Bar dataKey="overdue" name={t('overdue')}           fill={COLORS.overdue} radius={[3,3,0,0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Monthly breakdown */}
      {!loading && totalPlan > 0 && (
        <div className="border-t text-xs">
          <div className="grid grid-cols-[3rem_1fr_3.5rem_3.5rem_3.5rem] gap-2 bg-muted/30 px-5 py-1.5 text-muted-foreground">
            <span />
            <span>{t('on_time_rate')}</span>
            <span className="text-right text-blue-600">แผน</span>
            <span className="text-right text-emerald-600">ทันเวลา</span>
            <span className="text-right text-red-500">เกินกำหนด</span>
          </div>
          {monthly.map((row, i) => {
            if (row.totalPlan === 0) return null
            return (
              <MonthRow
                key={row.month}
                row={row}
                label={monthLabels[i]}
                expanded={expanded.has(row.month)}
                onToggle={() => toggleMonth(row.month)}
              />
            )
          })}
        </div>
      )}
    </Card>
  )
}