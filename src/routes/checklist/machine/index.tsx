import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MachineTbl, type MachineDTO } from '@/module/checklist/machine/machine-table'
import { getStatusColor } from '@/utils/status.untils'
import {
  CheckCircle2, AlertCircle, TrendingUp, TrendingDown,
  Search, Download, Drill, Wrench, XCircle, FileCheck, QrCode,
  X, Eye, Pencil, Building2, User, ShieldCheck,
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
import { PendingCard } from '@/module/checklist/machine/machine-pending'
import { useRouter } from '@tanstack/react-router'
import { useAuth } from '@/core/contexts/auth-context'

export const Route = createFileRoute('/checklist/machine/')({
  component: DataTbl,
})

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Image helpers ────────────────────────────────────────────────────────────

interface MachineImageFile {
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
}

function parseMachineImage(raw: string | undefined | null): string | null {
  if (!raw) return null
  try {
    const files: MachineImageFile[] = JSON.parse(raw)
    const first = files[0]
    if (!first?.fileUrl) return null
    // fileUrl คือ relative path เช่น /api/files/download/xxx.JPEG
    // ต่อกับ origin ของ browser โดยตรง
    return `${window.location.origin}${first.fileUrl}`
  } catch {
    return null
  }
}



const EDITABLE_ROLES = ['SUPERVISOR', 'MANAGER', 'ADMIN'] as const

// ─── Machine Detail Drawer ────────────────────────────────────────────────────

function MachineDetailDrawer({
  machine,
  onClose,
}: {
  machine: MachineDTO | null
  onClose: () => void
}) {
  const { t }  = useTranslation('checklist')
  const router = useRouter()
  const ref    = useRef<HTMLDivElement>(null)
  const { role } = useAuth()

  const canEdit = EDITABLE_ROLES.includes(role as typeof EDITABLE_ROLES[number])

  // close on outside click
  useEffect(() => {
    if (!machine) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [machine, onClose])

  // close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])


  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 ${
          machine ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t('machine_details') ?? 'Machine Details'}
        className={`fixed top-0 right-0 z-50 h-full w-80 bg-background border-l border-border shadow-xl flex flex-col transition-transform duration-200 ease-in-out ${
          machine ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Drill className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium">{t('machine_details') ?? 'Machine Details'}</span>
          </div>
          <div className="flex items-center gap-1">
            {machine && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    router.navigate({ to: '/checklist/machine/view', search: { id: machine.id } })
                  }
                  aria-label={t('view_document') ?? 'View'}
                >
                  <Eye className="w-4 h-4" />
                </Button>

                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      router.navigate({ to: '/checklist/machine/edit', search: { id: machine.id } })
                    }
                    aria-label={t('edit') ?? 'Edit'}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
              aria-label={t('back_to_list') ?? 'Close'}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        {machine && (
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {/* รูปเครื่อง */}
            {(() => {
              const imgUrl = parseMachineImage(machine.image)
              return (
                <div className="rounded-lg border overflow-hidden bg-muted/30 flex items-center justify-center h-40">
                  {imgUrl
                    ? <img src={imgUrl} alt={machine.machineCode} className="h-full w-full object-contain" />
                    : <Drill className="w-12 h-12 text-muted-foreground/30" />
                  }
                </div>
              )
            })()}

            {/* Identity card */}
            <div className="rounded-lg border px-4 py-3 bg-white dark:bg-muted/20 border-slate-200">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                {t('machine_code') ?? 'Machine Code'}
              </p>
              <p className="text-base font-semibold leading-tight">{machine.machineCode}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{machine.machineName}</p>
            </div>

            {/* Fields */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                  {t('department') ?? 'Department'}
                </div>
                <span className="text-xs text-foreground text-right">
                  {machine.departmentName || machine.department || '-'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <User className="w-3.5 h-3.5" />
                  {t('responsible') ?? 'Responsible'}
                </div>
                <span className="text-xs text-foreground text-right">
                  {machine.responsiblePersonName || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <Wrench className="w-3.5 h-3.5" />
                  {t('machine_status') ?? 'Machine Status'}
                </div>
                {machine.machineStatus
                  ? <Badge className={getStatusColor(machine.machineStatus)}>{machine.machineStatus}</Badge>
                  : <span className="text-xs text-muted-foreground">-</span>}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t('check_status') ?? 'Check Status'}
                </div>
                {machine.checkStatus
                  ? <Badge className={getStatusColor(machine.checkStatus)}>{machine.checkStatus}</Badge>
                  : <span className="text-xs text-muted-foreground">-</span>}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {t('warranty') ?? 'Warranty'}
                </div>
                {machine.hasWarranty === 'YES'
                  ? <Badge className="bg-emerald-100 text-emerald-700">{t('yes') ?? 'Yes'}</Badge>
                  : machine.hasWarranty === 'NO'
                    ? <Badge className="bg-slate-100 text-slate-500">{t('no') ?? 'No'}</Badge>
                    : <span className="text-xs text-muted-foreground">-</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

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

  const getRateColor = (rate: number) =>
    rate >= 80 ? 'text-green-600' : rate >= 60 ? 'text-yellow-600' : 'text-red-600'

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

      <PendingCard />

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
  const [showQrDialog, setShowQrDialog]   = useState(false)
  const [exportingQr, setExportingQr]     = useState(false)
  const [searchValue, setSearchValue]     = useState('')
  const [selectedIds, setSelectedIds]     = useState<number[]>([])
  // ── sidebar state ──
  const [selectedMachine, setSelectedMachine] = useState<MachineDTO | null>(null)

  const handleExportQr = async (mode: 'all' | 'selected') => {
    try {
      setShowQrDialog(false)
      setExportingQr(true)
      toast.info(t('preparing_qr_codes'))

      let machines: MachineDTO[] = []

      if (mode === 'selected') {
        if (selectedIds.length === 0) {
          toast.warning(t('no_items_selected'))
          setExportingQr(false)
          return
        }
        const params = new URLSearchParams({ index: '0', size: '9999' })
        if (searchValue.trim()) params.set('keyword', searchValue.trim())
        const res = await api.get<PageResponse<MachineDTO>>('/api/machine/get/page', { params })
        if (res?.success) machines = res.data.filter(m => selectedIds.includes(m.id))
      } else {
        const params = new URLSearchParams({ index: '0', size: '9999' })
        if (searchValue.trim()) params.set('keyword', searchValue.trim())
        const res = await api.get<PageResponse<MachineDTO>>('/api/machine/get/page', { params })
        if (res?.success) machines = res.data
      }

      const withQr = machines.filter(m => m.qrCode || m.qr_code)
      if (withQr.length === 0) { toast.warning(t('no_qr_found')); return }

      await exportMachineQrPdf(
        withQr.map(m => ({ ...m, qrCode: m.qrCode ?? m.qr_code ?? '' })) as any
      )
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
              <Button
                variant="outline"
                className="justify-start h-14 px-4"
                onClick={() => handleExportQr('selected')}
                disabled={selectedIds.length === 0}
              >
                <div className="flex flex-col items-start gap-0.5 w-full">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{t('export_selected')}</span>
                    {selectedIds.length > 0 && (
                      <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 leading-none">
                        {selectedIds.length}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.length === 0
                      ? t('select_items_from_table_first')
                      : t('export_selected_desc').replace('{count}', String(selectedIds.length))}
                  </span>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-14 px-4"
                onClick={() => handleExportQr('all')}
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="font-semibold">{t('export_all')}</span>
                  <span className="text-xs text-muted-foreground">{t('export_all_desc')}</span>
                </div>
              </Button>
            </div>
          </ShadcnDialogContent>
        </ShadcnDialog>

        {/*
          MachineTbl
          - onRowClick    → opens the detail sidebar
          - onSelectionChange → tracks checked ids for QR export
          - onSearchChange    → tracks search keyword for QR export
          NOTE: remove any per-row action buttons inside MachineTbl;
                row click is the only interaction now.
        */}
        <MachineTbl
          onRowClick={(machine: MachineDTO) =>
            setSelectedMachine(prev =>
              prev?.id === machine.id ? null : machine
            )
          }
          selectedRowId={selectedMachine?.id ?? null}
          onSelectionChange={setSelectedIds}
          onSearchChange={setSearchValue}
        />
      </main>

      {/* Machine detail sidebar */}
      <MachineDetailDrawer
        machine={selectedMachine}
        onClose={() => setSelectedMachine(null)}
      />
    </div>
  )
}