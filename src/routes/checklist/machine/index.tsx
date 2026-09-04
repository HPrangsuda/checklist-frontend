import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MachineTbl, type MachineDTO } from '@/module/checklist/machine/machine-table'
import { getStatusColor } from '@/utils/status.untils'
import {
  CheckCircle2, TrendingUp, TrendingDown,
  Search, Download, Drill, Wrench, QrCode,
  X, Eye, Pencil, Building2, User, ShieldCheck, ChevronLeft, ChevronRight,
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
  department:            string
  departmentName:        string
  total:                 number
  totalReadyToUse:       number
  totalUnderMaintenance: number
  readyRate:             number
}

type SortField = 'departmentName' | 'total' | 'readyRate'
type SortOrder = 'asc' | 'desc'

// ─── Image helpers ────────────────────────────────────────────────────────────

interface MachineImageFile { fileName: string; fileUrl: string; fileType: string; fileSize: number }

function parseMachineImagePaths(raw: string | undefined | null): string[] {
  if (!raw) return []
  try { return (JSON.parse(raw) as MachineImageFile[]).map(f => f.fileUrl).filter(Boolean) }
  catch { return [] }
}

function useAuthImage(path: string | null): { src: string | null; loading: boolean } {
  const [src, setSrc]         = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!path) { setSrc(null); return }
    let objectUrl: string | null = null
    let cancelled = false
    setLoading(true); setSrc(null)
    api.getInstance().get(path, { responseType: 'blob' })
      .then(res => { if (cancelled) return; objectUrl = URL.createObjectURL(res.data); setSrc(objectUrl) })
      .catch(() => { if (!cancelled) setSrc(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [path])
  return { src, loading }
}

function CarouselSlide({ path, alt }: { path: string; alt: string }) {
  const { src, loading } = useAuthImage(path)
  if (loading) return (
    <div className="flex-shrink-0 w-full h-full flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
    </div>
  )
  if (!src) return (
    <div className="flex-shrink-0 w-full h-full flex items-center justify-center">
      <Drill className="w-10 h-10 text-muted-foreground/20" />
    </div>
  )
  return <img src={src} alt={alt} className="flex-shrink-0 w-full h-full object-contain" />
}

function MachineImageCarousel({ paths, alt }: { paths: string[]; alt: string }) {
  const [index, setIndex] = useState(0)
  if (paths.length === 0) return (
    <div className="rounded-lg border bg-muted/30 flex items-center justify-center h-40">
      <Drill className="w-12 h-12 text-muted-foreground/20" />
    </div>
  )
  const prev = () => setIndex(i => (i - 1 + paths.length) % paths.length)
  const next = () => setIndex(i => (i + 1) % paths.length)
  return (
    <div className="rounded-lg border overflow-hidden bg-muted/30 relative h-40 select-none">
      <div className="w-full h-full"><CarouselSlide key={paths[index]} path={paths[index]} alt={`${alt} ${index + 1}`} /></div>
      {paths.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={next} className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"><ChevronRight className="w-4 h-4" /></button>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            {paths.map((_, i) => <button key={i} onClick={() => setIndex(i)} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? 'bg-white' : 'bg-white/40'}`} />)}
          </div>
          <span className="absolute top-1.5 right-2 text-[10px] text-white/80 bg-black/30 rounded px-1.5 py-0.5">{index + 1}/{paths.length}</span>
        </>
      )}
    </div>
  )
}

const EDITABLE_ROLES = ['SUPERVISOR', 'MANAGER', 'ADMIN', 'DEPARTMENT_ADMIN'] as const

// ─── Machine Detail Drawer ────────────────────────────────────────────────────

function MachineDetailDrawer({ machine, onClose }: { machine: MachineDTO | null; onClose: () => void }) {
  const { t }    = useTranslation('checklist')
  const router   = useRouter()
  const ref      = useRef<HTMLDivElement>(null)
  const { role } = useAuth()
  const canEdit    = EDITABLE_ROLES.includes(role as typeof EDITABLE_ROLES[number])
  const imagePaths = parseMachineImagePaths(machine?.image)

  useEffect(() => {
    if (!machine) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [machine, onClose])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 ${machine ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={t('machine_details')}
        className={`fixed top-0 right-0 z-50 h-full w-80 bg-background border-l border-border shadow-xl flex flex-col transition-transform duration-200 ease-in-out ${machine ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Drill className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium">{t('machine_details')}</span>
          </div>
          <div className="flex items-center gap-1">
            {machine && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => router.navigate({ to: '/checklist/machine/view', search: { id: machine.id } })}>
                  <Eye className="w-4 h-4" />
                </Button>
                {canEdit && (
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => router.navigate({ to: '/checklist/machine/edit', search: { id: machine.id } })}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>
        {machine && (
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            <MachineImageCarousel paths={imagePaths} alt={machine.machineCode} />
            <div className="rounded-lg border px-4 py-3 bg-white dark:bg-muted/20 border-slate-200">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{t('machine_code')}</p>
              <p className="text-base font-semibold leading-tight">{machine.machineCode}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{machine.machineName}</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0"><Building2 className="w-3.5 h-3.5" />{t('department')}</div>
                <span className="text-xs text-foreground text-right">{machine.departmentName || machine.department || '-'}</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0"><User className="w-3.5 h-3.5" />{t('responsible')}</div>
                <span className="text-xs text-foreground text-right">{machine.responsiblePersonName || '-'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0"><Wrench className="w-3.5 h-3.5" />{t('machine_status')}</div>
                {machine.machineStatus ? <Badge className={getStatusColor(machine.machineStatus)}>{machine.machineStatus}</Badge> : <span className="text-xs text-muted-foreground">-</span>}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0"><CheckCircle2 className="w-3.5 h-3.5" />{t('check_status')}</div>
                {machine.checkStatus ? <Badge className={getStatusColor(machine.checkStatus)}>{machine.checkStatus}</Badge> : <span className="text-xs text-muted-foreground">-</span>}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0"><ShieldCheck className="w-3.5 h-3.5" />{t('warranty')}</div>
                {machine.hasWarranty === 'YES' ? <Badge className="bg-emerald-100 text-emerald-700">{t('yes')}</Badge>
                  : machine.hasWarranty === 'NO' ? <Badge className="bg-slate-100 text-slate-500">{t('no')}</Badge>
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

function MachineDepartmentDashboard({ onOpenQrDialog, exportingQr }: { onOpenQrDialog: () => void; exportingQr: boolean }) {
  const { t } = useTranslation('checklist')

  const [departmentData, setDepartmentData] = useState<DepartmentSummary[]>([])
  const [filteredData,   setFilteredData]   = useState<DepartmentSummary[]>([])
  const [loading,        setLoading]        = useState(true)
  const [searchTerm,     setSearchTerm]     = useState('')
  const [sortField,      setSortField]      = useState<SortField>('total')
  const [sortOrder,      setSortOrder]      = useState<SortOrder>('desc')

  useEffect(() => { fetchDepartmentSummary() }, [])

  useEffect(() => {
    if (!Array.isArray(departmentData)) { setFilteredData([]); return }
    let f = [...departmentData]
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      f = f.filter(d => d.department.toLowerCase().includes(q) || (d.departmentName ?? '').toLowerCase().includes(q))
    }
    f.sort((a, b) => {
      const av = a[sortField] ?? 0; const bv = b[sortField] ?? 0
      const cmp = av > bv ? 1 : av < bv ? -1 : 0
      return sortOrder === 'asc' ? cmp : -cmp
    })
    setFilteredData(f)
  }, [departmentData, searchTerm, sortField, sortOrder])

  const fetchDepartmentSummary = async () => {
    try {
      setLoading(true)
      const response = await api.get<unknown>('/api/machine/department-summary')
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
      toast.error(t('data_fetch_failed'))
      setDepartmentData([])
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortOrder('desc') }
  }

  const getRateColor = (r: number) => r >= 80 ? 'text-emerald-600' : r >= 60 ? 'text-amber-500' : 'text-red-600'
  const getBarColor  = (r: number) => r >= 80 ? 'bg-emerald-500'  : r >= 60 ? 'bg-amber-400'   : 'bg-red-500'

  const exportToCSV = () => {
    const headers = [t('department'), t('total'), t('status_operational'), t('under_maintenance'), t('ready_rate')]
    const rows = filteredData.map(d => [
      d.departmentName || d.department,
      d.total,
      d.totalReadyToUse,
      d.totalUnderMaintenance,
      `${d.readyRate.toFixed(1)}%`,
    ])
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `machine-department-summary-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const totalMachines          = filteredData.reduce((s, d) => s + (d.total                || 0), 0)
  const totalReadyToUse        = filteredData.reduce((s, d) => s + (d.totalReadyToUse       || 0), 0)
  const totalUnderMaintenance  = filteredData.reduce((s, d) => s + (d.totalUnderMaintenance  || 0), 0)

  const sortFields: { field: SortField; label: string }[] = [
    { field: 'departmentName', label: t('department') },
    { field: 'total',          label: t('total')      },
    { field: 'readyRate',      label: t('ready_rate') },
  ]

  if (loading) return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {[1, 2].map(i => (
        <Card key={i} className="p-6 animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-4" />
          <div className="space-y-3"><div className="h-4 bg-muted rounded" /><div className="h-4 bg-muted rounded w-5/6" /></div>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="space-y-4 mb-6">

      <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-gradient-to-r from-red-50 dark:from-red-950/30 to-red-100/60 dark:to-red-900/20 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40 shrink-0">
            <Drill className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
              {t('machine_status_dashboard')}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('overview_departments').replace('{count}', String(filteredData.length))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportToCSV}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {t('export')}
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onOpenQrDialog} disabled={exportingQr}>
            {exportingQr
              ? <div className="w-3.5 h-3.5 mr-1.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              : <QrCode className="w-3.5 h-3.5 mr-1.5" />}
            {exportingQr ? t('generating') : t('export_qr')}
          </Button>
        </div>
      </div>

      <PendingCard />

      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">{t('total_machines')}</p><p className="text-2xl font-bold">{totalMachines}</p></div>
            <Drill className="w-8 h-8 text-muted-foreground/30" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">{t('ready_to_use')}</p><p className="text-2xl font-bold text-emerald-600">{totalReadyToUse}</p></div>
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">{t('under_maintenance')}</p><p className="text-2xl font-bold text-amber-600">{totalUnderMaintenance}</p></div>
            <Wrench className="w-8 h-8 text-amber-400" />
          </div>
        </Card>
      </div>

      {/* ── Department table ── */}
      <Card className="p-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-3 px-5 py-4 border-b">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder={t('search_department')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-8 text-xs" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-muted/50">
              <tr>
                {sortFields.map(({ field, label }) => (
                  <th key={field} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground cursor-pointer hover:bg-muted/80 select-none whitespace-nowrap" onClick={() => handleSort(field)}>
                    <div className="flex items-center gap-1.5">
                      {label}
                      {sortField === field && (sortOrder === 'asc' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground whitespace-nowrap">{t('machine_status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredData.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">{t('no_data_available')}</td></tr>
              ) : filteredData.map((dept, i) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 text-xs font-medium">{dept.departmentName || dept.department}</td>
                  <td className="px-4 py-2.5 text-xs text-center font-semibold">{dept.total}</td>
                  <td className="px-4 py-2.5 text-center min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-xs font-bold ${getRateColor(dept.readyRate)}`}>{dept.readyRate.toFixed(1)}%</span>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${getBarColor(dept.readyRate)}`} style={{ width: `${Math.min(dept.readyRate, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" />{dept.totalReadyToUse}</span>
                      <span className="flex items-center gap-1 text-amber-500 font-semibold"><Wrench className="w-3.5 h-3.5" />{dept.totalUnderMaintenance}</span>
                    </div>
                  </td>
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

  const [showQrDialog,    setShowQrDialog]    = useState(false)
  const [exportingQr,     setExportingQr]     = useState(false)
  const [searchValue,     setSearchValue]     = useState('')
  const [selectedIds,     setSelectedIds]     = useState<number[]>([])
  const [selectedMachine, setSelectedMachine] = useState<MachineDTO | null>(null)

  const handleExportQr = async (mode: 'all' | 'selected') => {
    try {
      setShowQrDialog(false); setExportingQr(true)
      toast.info(t('preparing_qr_codes'))
      let machines: MachineDTO[] = []
      const params = new URLSearchParams({ index: '0', size: '9999' })
      if (searchValue.trim()) params.set('keyword', searchValue.trim())
      const res = await api.get<PageResponse<MachineDTO>>('/api/machine/get/page', { params })
      if (res?.success) {
        machines = mode === 'selected' ? res.data.filter(m => selectedIds.includes(m.id)) : res.data
      }
      if (mode === 'selected' && selectedIds.length === 0) { toast.warning(t('please_select_at_least_one')); return }
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
        <MachineDepartmentDashboard onOpenQrDialog={() => setShowQrDialog(true)} exportingQr={exportingQr} />

        <ShadcnDialog open={showQrDialog} onOpenChange={setShowQrDialog}>
          <ShadcnDialogContent className="max-w-sm">
            <ShadcnDialogHeader>
              <ShadcnDialogTitle className="flex items-center gap-2"><QrCode className="w-5 h-5" />{t('export_qr_code')}</ShadcnDialogTitle>
              <ShadcnDialogDescription>{t('select_export_format')}</ShadcnDialogDescription>
            </ShadcnDialogHeader>
            <div className="flex flex-col gap-3 py-2">
              <Button variant="outline" className="justify-start h-14 px-4" onClick={() => handleExportQr('selected')} disabled={selectedIds.length === 0}>
                <div className="flex flex-col items-start gap-0.5 w-full">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{t('export_selected')}</span>
                    {selectedIds.length > 0 && <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 leading-none">{selectedIds.length}</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.length === 0 ? t('please_select_at_least_one') : t('export_selected_desc').replace('{count}', String(selectedIds.length))}
                  </span>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-14 px-4" onClick={() => handleExportQr('all')}>
                <div className="flex flex-col items-start gap-0.5">
                  <span className="font-semibold">{t('export_all')}</span>
                  <span className="text-xs text-muted-foreground">{t('export_all_desc')}</span>
                </div>
              </Button>
            </div>
          </ShadcnDialogContent>
        </ShadcnDialog>

        <MachineTbl
          onRowClick={(machine: MachineDTO) => setSelectedMachine(prev => prev?.id === machine.id ? null : machine)}
          selectedRowId={selectedMachine?.id ?? null}
          onSelectionChange={setSelectedIds}
          onSearchChange={setSearchValue}
        />
      </main>
      <MachineDetailDrawer machine={selectedMachine} onClose={() => setSelectedMachine(null)} />
    </div>
  )
}