import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MachineTbl } from '@/module/checklist/machine/machine-table'
import {
  CheckCircle2, AlertCircle, TrendingUp, TrendingDown,
  Search, Download, Drill, Wrench, XCircle, FileCheck, QrCode,
} from 'lucide-react'
import { exportMachineQrPdf } from '@/utils/exportMachineQrPdf'
import {
  Dialog as ShadcnDialog,
  DialogContent as ShadcnDialogContent,
  DialogHeader as ShadcnDialogHeader,
  DialogTitle as ShadcnDialogTitle,
  DialogDescription as ShadcnDialogDescription,
} from '@/components/ui/dialog'
import type { PageResponse } from '@/core/types/common'

export const Route = createFileRoute('/checklist/machine/')({
  component: DataTbl,
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface MachineDTO {
  id: number
  machineCode: string
  machineName: string
  qrCode?: string
  qr_code?: string
}

interface DepartmentSummary {
  department: string
  departmentName: string
  total: number
  totalReadyToUse: number
  totalRepair: number
  totalNotInUse: number
  totalCompleted: number
  totalPending: number
  totalApprove: number
  readyRate: number
  completedRate: number
  approveRate: number
}

type SortField = 'department' | 'total' | 'readyRate' | 'completedRate' | 'approveRate'
type SortOrder = 'asc' | 'desc'

// ─── MachineDepartmentDashboard ───────────────────────────────────────────────

interface MachineDepartmentDashboardProps {
  onOpenQrDialog: () => void
  exportingQr: boolean
}

function MachineDepartmentDashboard({ onOpenQrDialog, exportingQr }: MachineDepartmentDashboardProps) {
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
      const response = await api.get<unknown>('/api/machine/department-summary')
      let data: DepartmentSummary[] = []
      if (Array.isArray(response)) {
        data = response as DepartmentSummary[]
      } else if (response && typeof response === 'object') {
        const resObj = response as Record<string, any>
        const keys = Object.keys(resObj).filter(key => !isNaN(Number(key)))
        if (keys.length > 0)                    data = keys.map(key => resObj[key])
        else if (Array.isArray(resObj.data))    data = resObj.data
        else if (Array.isArray(resObj.body))    data = resObj.body
        else if (Array.isArray(resObj.content)) data = resObj.content
      }
      setDepartmentData(data)
    } catch {
      toast.error(t('data_fetch_failed'))
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
        const rate = d.readyRate || 0
        if (filterPerformance === 'excellent')      return rate >= 80
        if (filterPerformance === 'good')           return rate >= 60 && rate < 80
        if (filterPerformance === 'needsAttention') return rate < 60
        return true
      })
    }
    filtered.sort((a, b) => {
      const aVal = a[sortField] || 0
      const bVal = b[sortField] || 0
      return (aVal > bVal ? 1 : -1) * (sortOrder === 'asc' ? 1 : -1)
    })
    setFilteredData(filtered)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortOrder('desc') }
  }

  const getRateColor  = (rate: number) => rate >= 80 ? 'text-green-600' : rate >= 60 ? 'text-yellow-600' : 'text-red-600'

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 80) return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t('excellent')}</Badge>
    if (rate >= 60) return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">{t('good')}</Badge>
    return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{t('needs_attention')}</Badge>
  }

  const exportToCSV = () => {
    const headers = ['Department', 'Total', 'Operational', 'Under Repair', 'Non-Operational', 'Ready Rate', 'Completed', 'Pending', 'Completion Rate', 'Approve', 'Approve Rate']
    const rows = filteredData.map(d => [
      d.department, d.total, d.totalReadyToUse, d.totalRepair, d.totalNotInUse,
      `${d.readyRate.toFixed(1)}%`, d.totalCompleted, d.totalPending,
      `${d.completedRate.toFixed(1)}%`, d.totalApprove, `${d.approveRate.toFixed(1)}%`,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `machine-department-summary-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const totalMachines    = filteredData.reduce((s, d) => s + d.total, 0)
  const totalReadyToUse  = filteredData.reduce((s, d) => s + d.totalReadyToUse, 0)
  const totalRepair      = filteredData.reduce((s, d) => s + d.totalRepair, 0)
  const totalCompleted   = filteredData.reduce((s, d) => s + d.totalCompleted, 0)
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
    { field: 'readyRate',     label: t('ready_rate') },
    { field: 'completedRate', label: t('check_completion_rate') },
    { field: 'approveRate',   label: t('approve_rate') },
  ]

  return (
    <div className="space-y-6 mb-6">
      <Card className="bg-gradient-to-r from-red-50 dark:from-red-950/30 to-red-100 dark:to-red-900/30 border-0 shadow-md">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Drill className="w-6 h-6 text-red-600" />
                {t('machine_status_dashboard')}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t('overview_departments').replace('{count}', String(filteredData.length))}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-1" />{t('export')}
              </Button>
              <Button variant="outline" size="sm" onClick={onOpenQrDialog} disabled={exportingQr}>
                {exportingQr
                  ? <div className="w-4 h-4 mr-1 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  : <QrCode className="w-4 h-4 mr-1" />}
                {exportingQr ? t('generating') : t('export_qr')}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">{t('total_machines')}</p><p className="text-2xl font-bold">{totalMachines}</p></div>
            <Drill className="w-8 h-8 text-neutral-300" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">{t('ready_to_use')}</p><p className="text-2xl font-bold">{totalReadyToUse}</p></div>
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">{t('under_repair')}</p><p className="text-2xl font-bold text-red-600">{totalRepair}</p></div>
            <Wrench className="w-8 h-8 text-red-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('avg_check_completion')}</p>
              <p className={`text-2xl font-bold ${getRateColor(avgCompletedRate)}`}>{avgCompletedRate.toFixed(1)}%</p>
            </div>
            <FileCheck className="w-8 h-8 text-amber-500" />
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
                <th className="px-4 py-3 text-center font-semibold">{t('machine_status')}</th>
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
                  {(['readyRate', 'completedRate', 'approveRate'] as const).map(rk => (
                    <td key={rk} className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-bold ${getRateColor(dept[rk])}`}>{dept[rk].toFixed(1)}%</span>
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full ${dept[rk] >= 80 ? 'bg-green-500' : dept[rk] >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${dept[rk]}%` }} />
                        </div>
                      </div>
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <span className="flex items-center gap-1 text-green-600 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" />{dept.totalReadyToUse}</span>
                      <span className="flex items-center gap-1 text-red-600 font-semibold"><Wrench className="w-3.5 h-3.5" />{dept.totalRepair}</span>
                      <span className="flex items-center gap-1 text-yellow-600 font-semibold"><XCircle className="w-3.5 h-3.5" />{dept.totalNotInUse}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{getPerformanceBadge(dept.readyRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function DataTbl() {
  const { t } = useTranslation('checklist')
  const [showQrDialog, setShowQrDialog] = useState(false)
  const [exportingQr, setExportingQr]   = useState(false)
  const [searchValue, setSearchValue]   = useState('')

  const handleExportQr = async (mode: 'all' | 'selected') => {
    try {
      setShowQrDialog(false)
      setExportingQr(true)
      toast.info(t('preparing_qr_codes'))

      let machines: MachineDTO[] = []
      if (mode === 'all') {
        const params = new URLSearchParams({ index: '0', size: '9999' })
        if (searchValue.trim()) params.set('keyword', searchValue.trim())
        const res = await api.get<PageResponse<MachineDTO>>('/api/machine/get/page', { params })
        if (res?.success) machines = res.data
      }

      const withQr = machines.filter(m => m.qrCode || m.qr_code)
      if (withQr.length === 0) { toast.warning(t('no_qr_found')); return }

      await exportMachineQrPdf(withQr.map(m => ({ ...m, qrCode: m.qrCode ?? m.qr_code ?? '' })) as any)
      toast.success(t('export_qr_success').replace('{count}', String(withQr.length)))
    } catch {
      toast.error(t('export_failed'))
    } finally {
      setExportingQr(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <MachineDepartmentDashboard
          onOpenQrDialog={() => setShowQrDialog(true)}
          exportingQr={exportingQr}
        />

        {/* QR Export Dialog */}
        <ShadcnDialog open={showQrDialog} onOpenChange={setShowQrDialog}>
          <ShadcnDialogContent className="max-w-sm">
            <ShadcnDialogHeader>
              <ShadcnDialogTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />{t('export_qr_code')}
              </ShadcnDialogTitle>
              <ShadcnDialogDescription>{t('select_export_format')}</ShadcnDialogDescription>
            </ShadcnDialogHeader>
            <div className="flex flex-col gap-3 py-2">
              <Button variant="outline" className="justify-start h-14 px-4" onClick={() => handleExportQr('all')}>
                <div className="flex flex-col items-start">
                  <span className="font-semibold">{t('export_all')}</span>
                  <span className="text-xs text-muted-foreground">{t('export_all_desc')}</span>
                </div>
              </Button>
            </div>
          </ShadcnDialogContent>
        </ShadcnDialog>

        <MachineTbl />
      </main>
    </div>
  )
}