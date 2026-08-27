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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList } from 'lucide-react'
import { getStatusColor } from '@/utils/status.untils'

export const Route = createFileRoute('/checklist/checklist-records/')({
  component: Checklist,
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChecklistDTO {
  id: number
  machineCode: string
  machineName: string
  machineStatus: string
  checklistStatus: string
  userName: string
  createdAt: string
}

// ─── Main Component ───────────────────────────────────────────────────────────

function Checklist() {
  const { t } = useTranslation('checklist')
  const router = useRouter()

  const [pagination, setPagination]         = useState({ pageIndex: 0, pageSize: 10 })
  const [selectedIds, setSelectedIds]       = useState<number[]>([])
  const [searchValue, setSearchValue]       = useState('')
  const [data, setData]                     = useState<ChecklistDTO[]>([])
  const [loading, setLoading]               = useState(false)
  const [totalCount, setTotalCount]         = useState(0)
  const [keyword, setKeyword]               = useState('')
  const [pendingItems, setPendingItems]     = useState<ChecklistDTO[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const debouncedSearch = useDebounce(keyword, 500)

  // ─── effects ──────────────────────────────────────────────────────────────

  useEffect(() => { fetchPendingItems() }, [])
  useEffect(() => { setSearchValue(debouncedSearch) }, [debouncedSearch])
  useEffect(() => { onFetchData() }, [searchValue, pagination.pageIndex, pagination.pageSize])

  // ─── fetchers ─────────────────────────────────────────────────────────────

  const fetchPendingItems = async () => {
    try {
      setPendingLoading(true)
      const response = await api.get<{ success: boolean; data: ChecklistDTO[] }>('/api/checklist/pending')
      if (response?.success) {
        setPendingItems(response.data ?? [])
      }
    } catch {
      // ignore
    } finally {
      setPendingLoading(false)
    }
  }

  const onFetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('index', pagination.pageIndex.toString())
      params.set('size', pagination.pageSize.toString())
      if (searchValue.trim()) params.set('keyword', searchValue.trim())

      const response = await api.get<PageResponse<ChecklistDTO>>('/api/checklist/get/role', { params })
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

  // ─── handlers ─────────────────────────────────────────────────────────────

  const handleSearch = useCallback((value: string) => {
    setKeyword(value || '')
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleView = (id: number) => router.navigate({ to: '/checklist/checklist-records/view', search: { id } })
  const handleEdit = (id: number) => router.navigate({ to: '/checklist/checklist-records/edit', search: { id } })

  const getStatusLabel = (status: string) => {
    const key = `status_${status.toLowerCase().replace(/\s+/g, '_')}`
    const translated = t(key)
    return translated !== key ? translated : status
  }

  // ─── shared machine cell ──────────────────────────────────────────────────

  const MachineCell = ({ row }: { row: { original: ChecklistDTO } }) => (
    <div className="flex flex-col min-w-0 w-full overflow-hidden">
      <span className="text-sm truncate">{row.original.machineName}</span>
      <span className="text-xs text-muted-foreground">{row.original.machineCode}</span>
    </div>
  )

  const columns: ColumnDef<ChecklistDTO>[] = [
    {
      id: 'machine',
      size: 280,
      maxSize: 280,
      header: t('machine_name'),
      cell: ({ row }) => <MachineCell row={row} />,
    },
    {
      id: 'createdAt',
      header: t('created_at'),
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt)
        const formatted = date.toLocaleDateString('en-CA')
        return <span className="text-sm">{formatted}</span>
      },
    },
    {
      accessorKey: 'userName',
      header: t('user_name'),
      cell: ({ row }) => <div className="text-sm">{row.original.userName || '-'}</div>,
    },
    {
      accessorKey: 'machineStatus',
      header: t('machine_status'),
      cell: ({ row }) => row.original.machineStatus ? (
        <Badge className={getStatusColor(row.original.machineStatus)}>
          {getStatusLabel(row.original.machineStatus)}
        </Badge>
      ) : null,
    },
    {
      accessorKey: 'checklistStatus',
      header: t('check_status'),
      cell: ({ row }) => row.original.checklistStatus ? (
        <Badge className={getStatusColor(row.original.checklistStatus)}>
          {getStatusLabel(row.original.checklistStatus)}
        </Badge>
      ) : null,
    },
  ]

  // ─── columns (pending table) — คงเดิม ใช้ TblAction edit ─────────────────

  const pendingColumns: ColumnDef<ChecklistDTO>[] = [
    {
      id: 'action',
      header: t('action'),
      cell: ({ row }) => (
        <TblAction
          edit
          onEdit={() => handleEdit(row.original.id)}
        />
      ),
      size: 80,
    },
    {
      id: 'machine',
      size: 280,
      maxSize: 280,
      header: t('machine_name'),
      cell: ({ row }) => <MachineCell row={row} />,
    },
    {
      accessorKey: 'userName',
      header: t('user_name'),
      cell: ({ row }) => <div className="text-sm">{row.original.userName || '-'}</div>,
    },
    {
      accessorKey: 'machineStatus',
      header: t('machine_status'),
      cell: ({ row }) => row.original.machineStatus ? (
        <Badge className={getStatusColor(row.original.machineStatus)}>
          {getStatusLabel(row.original.machineStatus)}
        </Badge>
      ) : null,
    },
    {
      accessorKey: 'checklistStatus',
      header: t('check_status'),
      cell: ({ row }) => row.original.checklistStatus ? (
        <Badge className={getStatusColor(row.original.checklistStatus)}>
          {getStatusLabel(row.original.checklistStatus)}
        </Badge>
      ) : null,
    },
  ]

  // ─── tables ───────────────────────────────────────────────────────────────

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

  const pendingTable = useReactTable({
    data: pendingItems,
    columns: pendingColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: row => row.id.toString(),
  })

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-6">

        {(pendingLoading || pendingItems.length > 0) && (
          <Card className="p-6 border-red-200 dark:border-red-800">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4 px-0 pt-0">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                <ClipboardList className="h-5 w-5 text-red-600 dark:text-red-300" />
              </div>
              <div className="flex items-center gap-2">
                <CardTitle className="font-bold">{t('pending_approval')}</CardTitle>
                {!pendingLoading && (
                  <Badge className="bg-red-100 text-red-600 dark:text-red-100">
                    {pendingItems.length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {pendingLoading ? (
                <DataTableSkeleton
                  columnCount={pendingColumns.length} rowCount={3} filterCount={0}
                  cellWidths={['auto']} withViewOptions={false} withPagination={false}
                  shrinkZero={false} className="w-full"
                />
              ) : (
                <DataTable table={pendingTable} emptyText={t('no_result')} />
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Table Card */}
        <Card className="p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-bold">{t('checklist_records')}</CardTitle>
          </CardHeader>
          <TblContainer>
            <div>
              <DataTableToolbar
                table={table}
                isSync={false}
                onSearch={handleSearch}
                isServerSide={true}
                searchValue={keyword}
                breakpoint={1300}
                className="w-full gap-2"
              />
            </div>
            <div>
              {loading ? (
                <DataTableSkeleton
                  columnCount={columns.length} rowCount={10} filterCount={0}
                  cellWidths={['auto']} withViewOptions={false} withPagination={true}
                  shrinkZero={false} className="w-full"
                />
              ) : (
                <DataTable
                  table={table}
                  emptyText={t('no_result')}
                  onRowClick={(row: ChecklistDTO) => handleView(row.id)}
                />
              )}
            </div>
          </TblContainer>
        </Card>

      </main>
    </div>
  )
}