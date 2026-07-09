import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
import {
  PencilRuler, AlertCircle, CheckCircle2, Clock,
  TrendingUp, TrendingDown, Search, Download, ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DepartmentSummary {
  department: string
  departmentName: string
  total: number
  totalPass: number
  totalNotPass: number
  totalOnTime: number
  totalOverdue: number
  totalCompleted: number
  totalPending: number
  passRate: number
  onTimeRate: number
  completedRate: number
}

type SortField  = 'department' | 'total' | 'passRate' | 'onTimeRate' | 'completedRate'
type SortOrder  = 'asc' | 'desc'
type PerfFilter = 'all' | 'excellent' | 'good' | 'needsAttention'

// ปีที่แสดงใน dropdown (ปีปัจจุบัน ± 3 ปี)
const THIS_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => THIS_YEAR - 3 + i)

export function CalibrationDepartmentDashboard() {
  const { t } = useTranslation('checklist')

  const [selectedYear, setSelectedYear]     = useState<number>(THIS_YEAR)
  const [departmentData, setDepartmentData] = useState<DepartmentSummary[]>([])
  const [filteredData, setFilteredData]     = useState<DepartmentSummary[]>([])
  const [loading, setLoading]               = useState(true)
  const [searchTerm, setSearchTerm]         = useState('')
  const [sortField, setSortField]           = useState<SortField>('total')
  const [sortOrder, setSortOrder]           = useState<SortOrder>('desc')
  const [filterPerf, setFilterPerf]         = useState<PerfFilter>('all')

  // re-fetch เมื่อปีเปลี่ยน
  useEffect(() => { fetchDepartmentSummary(selectedYear) }, [selectedYear])

  // filter + sort client-side
  useEffect(() => {
    if (!Array.isArray(departmentData)) { setFilteredData([]); return }
    let f = [...departmentData]
    if (searchTerm) {
      f = f.filter(d =>
        d.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.departmentName && d.departmentName.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    if (filterPerf !== 'all') {
      f = f.filter(d => {
        const r = d.passRate || 0
        if (filterPerf === 'excellent')      return r >= 80
        if (filterPerf === 'good')           return r >= 60 && r < 80
        if (filterPerf === 'needsAttention') return r < 60
        return true
      })
    }
    f.sort((a, b) => {
      const aV = a[sortField] || 0
      const bV = b[sortField] || 0
      return (aV > bV ? 1 : -1) * (sortOrder === 'asc' ? 1 : -1)
    })
    setFilteredData(f)
  }, [departmentData, searchTerm, sortField, sortOrder, filterPerf])

  const fetchDepartmentSummary = async (year: number) => {
    try {
      setLoading(true)
      const response = await api.get<unknown>(`/api/calibration/department-summary?year=${year}`)
      let data: DepartmentSummary[] = []
      if (Array.isArray(response)) {
        data = response as DepartmentSummary[]
      } else if (response && typeof response === 'object') {
        const r = response as Record<string, any>
        const keys = Object.keys(r).filter(k => !isNaN(Number(k)))
        if (keys.length > 0)               data = keys.map(k => r[k])
        else if (Array.isArray(r.data))    data = r.data
        else if (Array.isArray(r.body))    data = r.body
        else if (Array.isArray(r.content)) data = r.content
      }
      setDepartmentData(data)
    } catch {
      toast.error(t('error_fetching_calibration_stats'))
      setDepartmentData([])
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortOrder('desc') }
  }

  const rateColor = (r: number) => r >= 80 ? 'text-emerald-600' : r >= 60 ? 'text-amber-500' : 'text-red-700'
  const barColor  = (r: number) => r >= 80 ? 'bg-emerald-500' : r >= 60 ? 'bg-amber-400' : 'bg-red-500'

  const perfBadge = (r: number) => {
    if (r >= 80) return <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{t('excellent')}</Badge>
    if (r >= 60) return <Badge className="bg-amber-100 text-amber-700 text-[10px]">{t('good')}</Badge>
    return <Badge className="bg-red-100 text-red-700 text-[10px]">{t('needs_attention')}</Badge>
  }

  const exportToCSV = () => {
    const headers = ['Department', 'Total', 'Pass', 'Not Pass', 'Pass Rate', 'On Time', 'Overdue', 'On-Time Rate', 'Completed', 'Pending', 'Completion Rate']
    const rows = filteredData.map(d => [
      d.department, d.total, d.totalPass, d.totalNotPass, `${d.passRate.toFixed(1)}%`,
      d.totalOnTime, d.totalOverdue, `${d.onTimeRate.toFixed(1)}%`,
      d.totalCompleted, d.totalPending, `${d.completedRate.toFixed(1)}%`,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `calibration-dept-${selectedYear}-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const totalMachines    = filteredData.reduce((s, d) => s + d.total, 0)
  const totalPass        = filteredData.reduce((s, d) => s + d.totalPass, 0)
  const totalCompleted   = filteredData.reduce((s, d) => s + d.totalCompleted, 0)
  const avgPassRate      = totalMachines > 0 ? (totalPass / totalMachines) * 100 : 0
  const avgCompletedRate = totalMachines > 0 ? (totalCompleted / totalMachines) * 100 : 0

  const sortFields: { field: SortField; label: string }[] = [
    { field: 'department',    label: t('department') },
    { field: 'total',         label: t('total') },
    { field: 'passRate',      label: t('pass_rate') },
    { field: 'onTimeRate',    label: t('on_time_rate') },
    { field: 'completedRate', label: t('completion_rate') },
  ]

  const perfFilters: { key: PerfFilter; label: string; cls: string }[] = [
    { key: 'all',            label: t('all'),             cls: '' },
    { key: 'excellent',      label: t('excellent'),       cls: 'text-emerald-600' },
    { key: 'good',           label: t('good'),            cls: 'text-amber-500' },
    { key: 'needsAttention', label: t('needs_attention'), cls: 'text-red-700' },
  ]

  return (
    <div className="space-y-4">

      {/* ── Header card ───────────────────────────────────────────────────── */}
      <Card className="p-0 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3 border-b px-5 py-4">
          <div>
            <CardTitle className="font-bold">
              <PencilRuler className="w-5 h-5 text-red-600 inline mr-2" />
              {t('calibration_performance_dashboard')}
            </CardTitle>
            {!loading && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {t('overview_departments').replace('{count}', String(filteredData.length))}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* ── Year selector ── */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-3 gap-1.5 font-semibold">
                  {selectedYear}
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[80px]">
                {YEAR_OPTIONS.map(y => (
                  <DropdownMenuItem
                    key={y}
                    className={y === selectedYear ? 'font-bold text-red-600' : ''}
                    onSelect={() => setSelectedYear(y)}
                  >
                    {y}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" className="h-8" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-1" />{t('export')}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t('total_machines'),     value: String(totalMachines),             icon: <PencilRuler  className="w-7 h-7 text-muted-foreground/30" />, color: '' },
          { label: t('due_within_30_days'), value: String(filteredData.length),       icon: <AlertCircle  className="w-7 h-7 text-red-400" />,             color: '' },
          { label: t('avg_pass_rate'),      value: `${avgPassRate.toFixed(1)}%`,      icon: <CheckCircle2 className="w-7 h-7 text-emerald-400" />,          color: rateColor(avgPassRate) },
          { label: t('avg_completion'),     value: `${avgCompletedRate.toFixed(1)}%`, icon: <Clock        className="w-7 h-7 text-amber-400" />,             color: rateColor(avgCompletedRate) },
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

      {/* ── Table card ────────────────────────────────────────────────────── */}
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
                            ? <TrendingUp className="w-3 h-3" />
                            : <TrendingDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground whitespace-nowrap">{t('pass_not_pass')}</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">{t('performance')}</th>
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
                    <td className="px-4 py-2.5 text-xs font-medium">{dept.departmentName || dept.department}</td>
                    <td className="px-4 py-2.5 text-xs text-center font-semibold">{dept.total}</td>
                    {(['passRate', 'onTimeRate', 'completedRate'] as const).map(rk => (
                      <td key={rk} className="px-4 py-2.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-xs font-bold ${rateColor(dept[rk])}`}>{dept[rk].toFixed(1)}%</span>
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColor(dept[rk])}`} style={{ width: `${dept[rk]}%` }} />
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
                    <td className="px-4 py-2.5 text-center">{perfBadge(dept.passRate)}</td>
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