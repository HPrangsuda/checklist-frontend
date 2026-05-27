import { getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import type { PageResponse } from '@/core/types/common'
import { useTranslation } from '@/core/contexts/language-context'
import { TblContainer } from '@/components/layout/tbl-container'
import { DataTable } from '@/components/data-table/data-table'
import { api } from '@/core/interceptor/api.interceptor'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { useDebounce } from '@/core/hooks/use-debounce'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { TblAction } from '@/components/action/tbl-action'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CheckCircle2, AlertCircle, Clock,
  TrendingUp, TrendingDown, Search, Download, Wrench,
} from 'lucide-react'

export const Route = createFileRoute('/checklist/maintenance/')({
  component: Maintenance,
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface MaintenanceDTO {
  id: number
  machineCode: string
  machineName: string
  years: string
  round: number
  dueDate: string
  planDate: string
  actualDate: string
  status: string
  maintenanceBy: string
}

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

type SortField = 'department' | 'total' | 'passRate' | 'onTimeRate' | 'completedRate'
type SortOrder = 'asc' | 'desc'

// ─── MaintenanceDepartmentDashboard ───────────────────────────────────────────

function MaintenanceDepartmentDashboard() {
  const { t } = useTranslation('checklist')
  const [departmentData, setDepartmentData] = useState<DepartmentSummary[]>([])
  const [filteredData, setFilteredData]     = useState<DepartmentSummary[]>([])
  const [loading, setLoading]               = useState(true)
  const [searchTerm, setSearchTerm]         = useState('')
  const [sortField, setSortField]           = useState<SortField>('total')
  const [sortOrder, setSortOrder]           = useState<SortOrder>('desc')
  const [filterPerformance, setFilterPerformance] = useState<'all' | 'excellent' | 'good' | 'needsAttention'>('all')

  useEffect(() => { fetchDepartmentSummary() }, [])
  useEffect(() => { filterAndSortData() }, [departmentData, searchTerm, sortField, sortOrder, filterPerformance])

  const fetchDepartmentSummary = async () => {
    try {
      setLoading(true)
      const response = await api.get<unknown>('/api/maintenance/department-summary')
      let data: DepartmentSummary[] = []
      if (Array.isArray(response)) {
        data = response as DepartmentSummary[]
      } else if (response && typeof response === 'object') {
        const r = response as Record<string, any>
        const keys = Object.keys(r).filter(k => !isNaN(Number(k)))
        if (keys.length > 0)              data = keys.map(k => r[k])
        else if (Array.isArray(r.data))   data = r.data
        else if (Array.isArray(r.body))   data = r.body
        else if (Array.isArray(r.content)) data = r.content
      }
      setDepartmentData(data)
    } catch {
      toast.error(t('error_fetching_maintenance_stats'))
      setDepartmentData([])
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortData = () => {
    if (!Array.isArray(departmentData)) { setFilteredData([]); return }
    let filtered = [...departmentData]
    if (searchTerm) {
      filtered = filtered.filter(d =>
        d.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.departmentName && d.departmentName.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    if (filterPerformance !== 'all') {
      filtered = filtered.filter(d => {
        const r = d.passRate || 0
        if (filterPerformance === 'excellent')      return r >= 80
        if (filterPerformance === 'good')           return r >= 60 && r < 80
        if (filterPerformance === 'needsAttention') return r < 60
        return true
      })
    }
    filtered.sort((a, b) => {
      const aV = a[sortField] || 0, bV = b[sortField] || 0
      return (aV > bV ? 1 : -1) * (sortOrder === 'asc' ? 1 : -1)
    })
    setFilteredData(filtered)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortOrder('desc') }
  }

  const getRateColor  = (r: number) => r >= 80 ? 'text-green-600' : r >= 60 ? 'text-yellow-600' : 'text-red-600'
  const getBarColor   = (r: number) => r >= 80 ? 'bg-green-500' : r >= 60 ? 'bg-yellow-500' : 'bg-red-500'

  const getPerformanceBadge = (r: number) => {
    if (r >= 80) return <Badge className="bg-green-100 text-green-700">{t('excellent')}</Badge>
    if (r >= 60) return <Badge className="bg-yellow-100 text-yellow-700">{t('good')}</Badge>
    return <Badge className="bg-red-100 text-red-700">{t('needs_attention')}</Badge>
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
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `maintenance-department-summary-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const totalMachines    = filteredData.reduce((s, d) => s + d.total, 0)
  const totalPass        = filteredData.reduce((s, d) => s + d.totalPass, 0)
  const totalCompleted   = filteredData.reduce((s, d) => s + d.totalCompleted, 0)
  const avgPassRate      = totalMachines > 0 ? (totalPass / totalMachines) * 100 : 0
  const avgCompletedRate = totalMachines > 0 ? (totalCompleted / totalMachines) * 100 : 0

  if (loading) return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {[1, 2].map(i => (
        <Card key={i} className="p-6 animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
          </div>
        </Card>
      ))}
    </div>
  )

  const sortFields: { field: SortField; label: string }[] = [
    { field: 'department',    label: t('department') },
    { field: 'total',         label: t('total') },
    { field: 'passRate',      label: t('pass_rate') },
    { field: 'onTimeRate',    label: t('on_time_rate') },
    { field: 'completedRate', label: t('completion_rate') },
  ]

  return (
    <div className="space-y-6 mb-6">
      <Card className="bg-gradient-to-r from-red-50 dark:from-red-950/30 to-red-100 dark:to-red-900/30 border-0 shadow-md">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Wrench className="w-6 h-6 text-red-600" />
                {t('maintenance_performance_dashboard')}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t('overview_departments').replace('{count}', String(filteredData.length))}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-1" />{t('export')}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">{t('total_machines')}</p><p className="text-2xl font-bold">{totalMachines}</p></div>
            <Wrench className="w-8 h-8 text-neutral-300" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">{t('due_within_30_days')}</p><p className="text-2xl font-bold">{filteredData.length}</p></div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('avg_pass_rate')}</p>
              <p className={`text-2xl font-bold ${getRateColor(avgPassRate)}`}>{avgPassRate.toFixed(1)}%</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('avg_completion')}</p>
              <p className={`text-2xl font-bold ${getRateColor(avgCompletedRate)}`}>{avgCompletedRate.toFixed(1)}%</p>
            </div>
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder={t('search_department')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'excellent', 'good', 'needsAttention'] as const).map(f => (
              <Button key={f} variant={filterPerformance === f ? 'default' : 'outline'} size="sm" onClick={() => setFilterPerformance(f)}
                className={f === 'excellent' ? 'text-green-600' : f === 'needsAttention' ? 'text-red-600' : f === 'good' ? 'text-yellow-500' : ''}>
                {f === 'excellent' && <CheckCircle2 className="w-4 h-4 mr-1" />}
                {f === 'needsAttention' && <AlertCircle className="w-4 h-4 mr-1" />}
                {f === 'all' ? t('all') : f === 'excellent' ? t('excellent') : f === 'good' ? t('good') : t('needs_attention')}
              </Button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b">
              <tr>
                {sortFields.map(({ field, label }) => (
                  <th key={field} className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort(field)}>
                    <div className="flex items-center gap-2">
                      {label}
                      {sortField === field && (sortOrder === 'asc' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />)}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-semibold">{t('pass_not_pass')}</th>
                <th className="px-4 py-3 text-center font-semibold">{t('performance')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredData.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-600 dark:text-gray-400">{t('no_data_available')}</td></tr>
              ) : filteredData.map((dept, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium">{dept.departmentName || dept.department}</td>
                  <td className="px-4 py-3 text-center font-semibold">{dept.total}</td>
                  {(['passRate', 'onTimeRate', 'completedRate'] as const).map(rk => (
                    <td key={rk} className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-bold ${getRateColor(dept[rk])}`}>{dept[rk].toFixed(1)}%</span>
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full ${getBarColor(dept[rk])}`} style={{ width: `${dept[rk]}%` }} />
                        </div>
                      </div>
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-green-600 font-semibold">{dept.totalPass}</span>
                      <span className="text-gray-400">/</span>
                      <span className="text-red-600 font-semibold">{dept.totalNotPass}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{getPerformanceBadge(dept.passRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ─── Maintenance Table ────────────────────────────────────────────────────────

function MaintenanceTable() {
  const { t }  = useTranslation('checklist')
  const router = useRouter()

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [data, setData]               = useState<MaintenanceDTO[]>([])
  const [loading, setLoading]         = useState(false)
  const [totalCount, setTotalCount]   = useState(0)
  const [keyword, setKeyword]         = useState('')
  const [searchValue, setSearchValue] = useState('')
  const debouncedSearch               = useDebounce(keyword, 500)

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'on time':  return 'bg-emerald-100 text-emerald-600 dark:text-emerald-100'
      case 'overdue':  return 'bg-red-100 text-red-600 dark:text-red-100'
      default:         return 'bg-zinc-100 text-zinc-600 dark:text-zinc-100'
    }
  }

  const getStatusLabel = (status: string) => {
    const key = `status_${status.toLowerCase().replace(/\s+/g, '_')}`
    const tr = t(key)
    return tr !== key ? tr : status
  }

  const columns: ColumnDef<MaintenanceDTO>[] = [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={data.length > 0 && data.every(r => selectedIds.includes(r.id))}
          onCheckedChange={checked => setSelectedIds(checked ? data.map(r => r.id) : [])}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <div onClick={e => e.stopPropagation()}>
          <Checkbox
            checked={selectedIds.includes(row.original.id)}
            onCheckedChange={checked =>
              setSelectedIds(prev => checked ? [...prev, row.original.id] : prev.filter(id => id !== row.original.id))
            }
            aria-label="Select row"
          />
        </div>
      ),
      size: 32,
    },
    {
      id: 'action',
      header: t('action'),
      cell: ({ row }) => (
        <TblAction
          view edit
          onView={() => router.navigate({ to: '/checklist/maintenance/view', search: { id: row.original.id } })}
          onEdit={() => router.navigate({ to: '/checklist/maintenance/edit', search: { id: row.original.id } })}
        />
      ),
      size: 80,
    },
    { accessorKey: 'machineCode', header: t('machine_code'),  cell: ({ row }) => <div className="text-sm">{row.original.machineCode}</div> },
    { accessorKey: 'machineName', header: t('machine_name'),  cell: ({ row }) => <div className="text-sm">{row.original.machineName}</div> },
    { accessorKey: 'years',       header: t('years'),          cell: ({ row }) => <div className="text-sm">{row.original.years}</div> },
    { accessorKey: 'round',       header: t('round'),          cell: ({ row }) => <div className="text-sm">{row.original.round}</div> },
    {
      accessorKey: 'dueDate',
      header: t('due_date'),
      cell: ({ row }) => {
        const d = row.original.dueDate
        if (!d) return <div className="text-sm">-</div>
        const [y, m, day] = d.split('-')
        return <div className="text-sm">{`${day}-${m}-${y}`}</div>
      },
    },
    {
      accessorKey: 'status',
      header: t('check_status'),
      cell: ({ row }) => row.original.status
        ? <Badge className={getStatusColor(row.original.status)}>{getStatusLabel(row.original.status)}</Badge>
        : <>-</>,
    },
    
  ]

  useEffect(() => { setSearchValue(debouncedSearch) }, [debouncedSearch])
  useEffect(() => { onFetchData() }, [searchValue, pagination.pageIndex, pagination.pageSize])

  const onFetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('index', pagination.pageIndex.toString())
      params.set('size', pagination.pageSize.toString())
      if (searchValue.trim()) params.set('keyword', searchValue.trim())

      const response = await api.get<PageResponse<MaintenanceDTO>>('/api/maintenance/get/page', { params })
      if (response?.success) {
        setData(response.data ?? [])
        setTotalCount(response.totalElements ?? 0)
      } else {
        toast.error(response?.message ?? t('data_fetch_failed'))
        setData([])
      }
    } catch {
      toast.error(t('data_fetch_failed'))
      setData([])
    } finally {
      setLoading(false)
      setSelectedIds([])
    }
  }

  const handleSearch = useCallback((value: string) => {
    setKeyword(value || '')
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const table = useReactTable({
    data, columns, manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    manualSorting: true, manualFiltering: true,
    state: { pagination },
    getRowId: row => row.id.toString(),
  })

  return (
    <Card className="p-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b">
        <CardTitle className="font-bold">
          <Wrench className="w-5 h-5 text-red-600 inline mr-2" />
          {t('maintenance_lists')}
        </CardTitle>
      </CardHeader>
      <TblContainer>
        <div>
          <DataTableToolbar
            table={table} isSync={false} onSearch={handleSearch}
            isServerSide={true} searchValue={keyword} breakpoint={1300} className="w-full gap-2"
          />
        </div>
        <div>
          {loading ? (
            <DataTableSkeleton columnCount={columns.length} rowCount={10} filterCount={0} cellWidths={['auto']} withViewOptions={false} withPagination={true} shrinkZero={false} className="w-full" />
          ) : (
            <DataTable table={table} emptyText={t('no_result')} />
          )}
        </div>
      </TblContainer>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function Maintenance() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <MaintenanceDepartmentDashboard />
        <MaintenanceTable />
      </main>
    </div>
  )
}