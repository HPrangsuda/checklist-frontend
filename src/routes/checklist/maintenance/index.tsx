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
import { Wrench } from 'lucide-react'
import { MaintenanceKanbanCard } from '@/module/checklist/maintenance/maintencekanbancard'
import { MaintenanceDepartmentDashboard } from '@/module/checklist/maintenance/maintenance-department-dashboard'

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
    <Card className="p-0 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b px-5 py-4">
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
        <MaintenanceKanbanCard />
      </main>
    </div>
  )
}