import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
import {
  PencilRuler, AlertCircle, CheckCircle2, Clock,
  TrendingUp, TrendingDown, Search, Download,
} from 'lucide-react'
import { toast } from 'sonner'

interface DepartmentSummaryRaw {
  department:     string
  departmentName: string
  total:          number
  totalPass:      number
  totalNotPass:   number
  totalOnTime:    number
  totalOverdue:   number
  totalCompleted: number
  totalPending:   number
}

interface DepartmentSummary extends DepartmentSummaryRaw {
  passRate:      number
  onTimeRate:    number
  completedRate: number
}

type SortField  = 'departmentName' | 'total' | 'passRate' | 'onTimeRate' | 'completedRate'
type SortOrder  = 'asc' | 'desc'
type PerfFilter = 'all' | 'excellent' | 'good' | 'needsAttention'

interface Props { year: number }

function withRates(raw: DepartmentSummaryRaw): DepartmentSummary {
  const total = raw.total || 0
  return {
    ...raw,
    passRate:      total > 0 ? (raw.totalPass      / total) * 100 : 0,
    onTimeRate:    total > 0 ? (raw.totalOnTime     / total) * 100 : 0,
    completedRate: total > 0 ? (raw.totalCompleted  / total) * 100 : 0,
  }
}

function parseResponse(response: unknown): DepartmentSummaryRaw[] {
  if (Array.isArray(response)) return response as DepartmentSummaryRaw[]
  if (response && typeof response === 'object') {
    const r = response as Record<string, any>
    const numericKeys = Object.keys(r).filter(k => !isNaN(Number(k)))
    if (numericKeys.length > 0)   return numericKeys.map(k => r[k])
    if (Array.isArray(r.data))    return r.data
    if (Array.isArray(r.body))    return r.body
    if (Array.isArray(r.content)) return r.content
  }
  return []
}

export function CalibrationDepartmentDashboard({ year }: Props) {
  const { t } = useTranslation('checklist')

  const [departmentData, setDepartmentData] = useState<DepartmentSummary[]>([])
  const [filteredData,   setFilteredData]   = useState<DepartmentSummary[]>([])
  const [loading,        setLoading]        = useState(true)
  const [searchTerm,     setSearchTerm]     = useState('')
  const [sortField,      setSortField]      = useState<SortField>('total')
  const [sortOrder,      setSortOrder]      = useState<SortOrder>('desc')
  const [filterPerf,     setFilterPerf]     = useState<PerfFilter>('all')

  useEffect(() => { fetchDepartmentSummary() }, [year])

  const fetchDepartmentSummary = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('year', String(year))
      const response = await api.get<unknown>(
        `/api/calibration/department-summary?${params.toString()}`
      )
      setDepartmentData(parseResponse(response).map(withRates))
    } catch {
      toast.error(t('error_fetching_calibration_stats'))
      setDepartmentData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let f = [...departmentData]
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      f = f.filter(d =>
        d.department.toLowerCase().includes(q) ||
        (d.departmentName ?? '').toLowerCase().includes(q)
      )
    }
    if (filterPerf !== 'all') {
      f = f.filter(d => {
        const score      = perfScore(d)
        const hasResults = d.totalPass + d.totalNotPass > 0
        const isPending  = !hasResults && d.completedRate === 0 && d.onTimeRate === 0
        if (filterPerf === 'excellent')      return !isPending && score >= 80
        if (filterPerf === 'good')           return !isPending && score >= 60 && score < 80
        if (filterPerf === 'needsAttention') return isPending  || score < 60
        return true
      })
    }
    f.sort((a, b) => {
      const av = a[sortField] ?? 0
      const bv = b[sortField] ?? 0
      const cmp = av > bv ? 1 : av < bv ? -1 : 0
      return sortOrder === 'asc' ? cmp : -cmp
    })
    setFilteredData(f)
  }, [departmentData, searchTerm, sortField, sortOrder, filterPerf])

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortOrder('desc') }
  }

  const rateColor = (r: number) =>
    r >= 80 ? 'text-emerald-600' : r >= 60 ? 'text-amber-500' : 'text-red-700'
  const barColor  = (r: number) =>
    r >= 80 ? 'bg-emerald-500'  : r >= 60 ? 'bg-amber-400'   : 'bg-red-700'

  const perfScore = (dept: DepartmentSummary): number => {
    const hasResults = dept.totalPass + dept.totalNotPass > 0
    if (!hasResults) return (dept.onTimeRate + dept.completedRate) / 2
    return dept.passRate * 0.5 + dept.onTimeRate * 0.3 + dept.completedRate * 0.2
  }

  const perfBadge = (dept: DepartmentSummary) => {
    const score      = perfScore(dept)
    const hasResults = dept.totalPass + dept.totalNotPass > 0
    if (!hasResults && dept.completedRate === 0 && dept.onTimeRate === 0)
      return <Badge className="bg-zinc-100 text-zinc-500 text-[10px]">{t('pending')}</Badge>
    if (score >= 80) return <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{t('excellent')}</Badge>
    if (score >= 60) return <Badge className="bg-amber-100  text-amber-700  text-[10px]">{t('good')}</Badge>
    return                  <Badge className="bg-red-100    text-red-700    text-[10px]">{t('needs_attention')}</Badge>
  }

  const exportToCSV = () => {
    const headers = [
      t('department'), t('total'), t('status_pass'), t('status_not_pass'),
      t('pass_rate'), t('status_on_time'), t('status_overdue'), t('on_time_rate'),
      t('completed'), t('pending'), t('completion_rate'),
    ]
    const rows = filteredData.map(d => [
      d.departmentName || d.department,
      d.total, d.totalPass, d.totalNotPass,
      `${d.passRate.toFixed(1)}%`,
      d.totalOnTime, d.totalOverdue,
      `${d.onTimeRate.toFixed(1)}%`,
      d.totalCompleted, d.totalPending,
      `${d.completedRate.toFixed(1)}%`,
    ])
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `calibration-department-summary-${year}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalCalibrations = filteredData.reduce((s, d) => s + (d.total          || 0), 0)
  const totalPassAll      = filteredData.reduce((s, d) => s + (d.totalPass       || 0), 0)
  const totalOverdueAll   = filteredData.reduce((s, d) => s + (d.totalOverdue    || 0), 0)
  const totalCompletedAll = filteredData.reduce((s, d) => s + (d.totalCompleted  || 0), 0)
  const avgPassRate       = totalCalibrations > 0 ? (totalPassAll      / totalCalibrations) * 100 : 0
  const avgCompletedRate  = totalCalibrations > 0 ? (totalCompletedAll / totalCalibrations) * 100 : 0

  const sortFields: { field: SortField; label: string }[] = [
    { field: 'departmentName', label: t('department')      },
    { field: 'total',          label: t('total')           },
    { field: 'passRate',       label: t('pass_rate')       },
    { field: 'onTimeRate',     label: t('on_time_rate')    },
    { field: 'completedRate',  label: t('completion_rate') },
  ]

  const perfFilters: { key: PerfFilter; label: string; cls: string }[] = [
    { key: 'all',            label: t('all'),             cls: '' },
    { key: 'excellent',      label: t('excellent'),       cls: 'text-emerald-600' },
    { key: 'good',           label: t('good'),            cls: 'text-amber-500' },
    { key: 'needsAttention', label: t('needs_attention'), cls: 'text-red-700' },
  ]

  return (
    <div className="space-y-4 mb-4">

      {/* ── Header ── */}
      <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-gradient-to-r from-red-50 dark:from-red-950/30 to-red-100/60 dark:to-red-900/20 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40 shrink-0">
            <PencilRuler className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
              {t('calibration_performance_dashboard')}
            </h2>
            {!loading && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('overview_cal_departments').replace('{count}', String(filteredData.length))}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportToCSV}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {t('export')}
          </Button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t('total_calibrations'), value: String(totalCalibrations), icon: <PencilRuler  className="w-7 h-7 text-muted-foreground/30" />, color: '' },
          { label: t('total_overdue'),      value: String(totalOverdueAll),   icon: <AlertCircle  className="w-7 h-7 text-red-400" />,            color: totalOverdueAll > 0 ? 'text-red-700' : '' },
          { label: t('avg_pass_rate'),      value: `${avgPassRate.toFixed(1)}%`,      icon: <CheckCircle2 className="w-7 h-7 text-emerald-400" />, color: rateColor(avgPassRate) },
          { label: t('avg_completion'),     value: `${avgCompletedRate.toFixed(1)}%`, icon: <Clock        className="w-7 h-7 text-amber-400" />,   color: rateColor(avgCompletedRate) },
        ].map(({ label, value, icon, color }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p>
              </div>
              {icon}
            </div>
          </Card>
        ))}
      </div>

      {/* ── Table card ── */}
      <Card className="p-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-3 px-5 py-4 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder={t('search_department')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-xs"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {perfFilters.map(({ key, label, cls }) => (
              <Button
                key={key}
                variant={filterPerf === key ? 'default' : 'outline'}
                size="sm"
                className={`h-8 text-xs ${filterPerf !== key ? cls : ''}`}
                onClick={() => setFilterPerf(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="space-y-2 p-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="bg-muted/50">
                <tr>
                  {sortFields.map(({ field, label }) => (
                    <th
                      key={field}
                      className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground cursor-pointer hover:bg-muted/80 select-none whitespace-nowrap"
                      onClick={() => handleSort(field)}
                    >
                      <div className="flex items-center gap-1.5">
                        {label}
                        {sortField === field && (
                          sortOrder === 'asc'
                            ? <TrendingUp   className="w-3 h-3" />
                            : <TrendingDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    {t('pass_not_pass')}
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">
                    {t('performance')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {t('no_data_available')}
                    </td>
                  </tr>
                ) : filteredData.map((dept, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 text-xs font-medium">
                      {dept.departmentName || dept.department}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-center font-semibold">
                      {dept.total}
                    </td>
                    {(['passRate', 'onTimeRate', 'completedRate'] as const).map(rk => (
                      <td key={rk} className="px-4 py-2.5 text-center min-w-[100px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-xs font-bold ${rateColor(dept[rk])}`}>
                            {dept[rk].toFixed(1)}%
                          </span>
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${barColor(dept[rk])}`}
                              style={{ width: `${Math.min(dept[rk], 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-xs">
                        <span className="text-emerald-600 font-semibold">{dept.totalPass}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-red-700 font-semibold">{dept.totalNotPass}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {perfBadge(dept)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}