import { getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import type { PageResponse, ResponseDTO } from '@/core/types/common'
import { useTranslation } from '@/core/contexts/language-context'
import { DeleteDialog } from '@/components/dialog/delete-dialog'
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
import { PencilRuler } from 'lucide-react'
import { CalibrationDepartmentDashboard } from '@/module/checklist/calibration/calibration-department-dashboard'
import { CalibrationKanbanCard } from '@/module/checklist/calibration/calibrationkanbancard'

export const Route = createFileRoute('/checklist/calibration/')({
  component: Calibration,
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalibrationDTO {
  id: number
  machineCode: string
  machineName: string
  years: number
  results?: string
  dueDate?: string
  calibrationStatus?: string
}

// ─── Calibration Table ────────────────────────────────────────────────────────

function CalibrationTable() {
  const { t }  = useTranslation('checklist')
  const router = useRouter()

  const [pagination, setPagination]             = useState({ pageIndex: 0, pageSize: 10 })
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedIds, setSelectedIds]           = useState<number[]>([])
  const [data, setData]                         = useState<CalibrationDTO[]>([])
  const [loading, setLoading]                   = useState(false)
  const [totalCount, setTotalCount]             = useState(0)
  const [keyword, setKeyword]                   = useState('')
  const [searchValue, setSearchValue]           = useState('')
  const debouncedSearch                         = useDebounce(keyword, 500)

  const getResultBadge = (result?: string) => {
    if (!result) return '-'
    const cfg: Record<string, string> = {
      'NOT PASS': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'PASS':     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    }
    const cls   = cfg[result] ?? 'bg-zinc-100 text-zinc-600'
    const key   = `status_${result.toLowerCase().replace(/\s+/g, '_')}`
    const label = t(key) !== key ? t(key) : result
    return <Badge className={cls}>{label}</Badge>
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return '-'
    const cfg: Record<string, string> = {
      'ON TIME': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      'OVERDUE': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'PENDING': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    }
    const cls   = cfg[status] ?? 'bg-zinc-100 text-zinc-600'
    const key   = `status_${status.toLowerCase().replace(/\s+/g, '_')}`
    const label = t(key) !== key ? t(key) : status
    return <Badge className={cls}>{label}</Badge>
  }

  const columns: ColumnDef<CalibrationDTO>[] = [
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
    { accessorKey: 'machineCode', header: t('machine_code'), cell: ({ row }) => <div className="text-sm">{row.original.machineCode}</div> },
    { accessorKey: 'machineName', header: t('machine_name'), cell: ({ row }) => <div className="text-sm">{row.original.machineName}</div> },
    { accessorKey: 'years',       header: t('years'),         cell: ({ row }) => <div className="text-sm">{row.original.years}</div> },
    {
      accessorKey: 'dueDate',
      header: t('calibration_due_date'),
      cell: ({ row }) => {
        const d = row.original.dueDate
        if (!d) return <div className="text-sm">-</div>
        const [y, m, day] = d.split('-')
        return <div className="text-sm">{`${day}-${m}-${y}`}</div>
      },
    },
    {
      accessorKey: 'results',
      header: t('results'),
      cell: ({ row }) => getResultBadge(row.original.results),
    },
    {
      accessorKey: 'calibrationStatus',
      header: t('calibration_status'),
      cell: ({ row }) => getStatusBadge(row.original.calibrationStatus),
    },
    {
      id: 'action',
      header: t('action'),
      cell: ({ row }) => (
        <TblAction
          view edit delete
          onView={() => router.navigate({ to: '/checklist/calibration/view', search: { id: row.original.id } })}
          onEdit={() => router.navigate({ to: '/checklist/calibration/edit', search: { id: row.original.id } })}
          onDelete={() => { setSelectedIds([row.original.id]); setShowDeleteDialog(true) }}
        />
      ),
      size: 80,
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

      const response = await api.get<PageResponse<CalibrationDTO>>('/api/calibration/get/page', { params })
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

  const onDeleteData = async (): Promise<{ success: boolean }> => {
    if (!selectedIds.length) return { success: false }
    try {
      const response = await api.delete<ResponseDTO<void>>('/api/calibration/delete', {
        headers: { 'Content-Type': 'application/json' },
        data: selectedIds,
      })
      if (response.success) { toast.success(response.message); return { success: true } }
      toast.error(response.message); return { success: false }
    } catch {
      toast.error(t('data_delete_failed')); return { success: false }
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
    <Card className="p-0 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b px-5 py-4">
        <CardTitle className="font-bold">
          <PencilRuler className="w-5 h-5 text-red-600 inline mr-2" />
          {t('calibration_lists')}
        </CardTitle>
      </CardHeader>
      <TblContainer>
        <div>
          <DataTableToolbar
            table={table} isSync={false}
            isDelete={selectedIds.length > 0}
            onSearch={handleSearch} onDelete={() => setShowDeleteDialog(true)}
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
        <DeleteDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          title={t('delete_calibrations')}
          confirmText="DELETE"
          isAlert={false}
          variant="destructive"
          onConfirm={onDeleteData}
          onSuccess={() => { onFetchData(); setSelectedIds([]) }}
        />
      </TblContainer>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function Calibration() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <CalibrationDepartmentDashboard />
        <CalibrationKanbanCard />
      </main>
    </div>
  )
}