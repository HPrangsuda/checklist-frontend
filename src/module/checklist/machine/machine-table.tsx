import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import type { PageResponse, ResponseDTO } from '@/core/types/common'
import { useTranslation } from '@/core/contexts/language-context'
import { DeleteDialog } from '@/components/dialog/delete-dialog'
import { TblContainer } from '@/components/layout/tbl-container'
import { DataTable } from '@/components/data-table/data-table'
import { api } from '@/core/interceptor/api.interceptor'
import { useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { useDebounce } from '@/core/hooks/use-debounce'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { TblAction } from '@/components/action/tbl-action'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Drill } from 'lucide-react'
import { getStatusColor } from '@/utils/status.untils'
import { useAuth } from '@/core/contexts/auth-context'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MachineDTO {
  id: number
  machineCode: string
  machineName: string
  department: string
  machineStatus: string
  checkStatus: string
  responsiblePersonName: string
}

type ViewMode = 'overview' | 'mine'

// ─── Component ────────────────────────────────────────────────────────────────

export function MachineTbl() {
  const { t } = useTranslation('checklist')
  const router = useRouter()
  const { role } = useAuth()
  const isManagerOrSupervisor = role === 'MANAGER' || role === 'SUPERVISOR'

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [data, setData] = useState<MachineDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('mine')
  const debouncedSearch = useDebounce(keyword, 500)

  // ─── Status label helper ───────────────────────────────────────────────────

  const getStatusLabel = (status: string) => {
    const key = status.toLowerCase().replace(/\s+/g, '_')
    const translated = t(`status_${key}`)
    return translated !== `status_${key}` ? translated : status
  }

  // ─── Columns ──────────────────────────────────────────────────────────────

  const columns: ColumnDef<MachineDTO>[] = [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={data.length > 0 && data.every(row => selectedIds.includes(row.id))}
          onCheckedChange={checked =>
            setSelectedIds(checked ? data.map(r => r.id) : [])
          }
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <div onClick={e => e.stopPropagation()}>
          <Checkbox
            checked={selectedIds.includes(row.original.id)}
            onCheckedChange={checked =>
              setSelectedIds(prev =>
                checked
                  ? [...prev, row.original.id]
                  : prev.filter(id => id !== row.original.id)
              )
            }
            aria-label="Select row"
          />
        </div>
      ),
      size: 32,
    },
    ,
    {
      id: 'action',
      header: t('action'),
      cell: ({ row }) => (
        <TblAction
          view
          edit
          delete
          onView={() => handleView(row.original.id)}
          onEdit={() => handleEdit(row.original.id)}
          onDelete={() => handleDelete(row.original.id)}
        />
      ),
      size: 80,
    },
    {
      accessorKey: 'machineCode',
      header: t('machine_code'),
      cell: ({ row }) => <div className="text-sm">{row.original.machineCode}</div>,
    },
    {
      accessorKey: 'machineName',
      header: t('machine_name'),
      cell: ({ row }) => <div className="text-sm">{row.original.machineName}</div>,
    },
    {
      accessorKey: 'department',
      header: t('department'),
      cell: ({ row }) => (
        <div className="text-sm">{row.original.department || '-'}</div>
      ),
    },
    {
      accessorKey: 'machineStatus',
      header: t('machine_status'),
      cell: ({ row }) =>
        row.original.machineStatus ? (
          <Badge className={getStatusColor(row.original.machineStatus)}>
            {getStatusLabel(row.original.machineStatus)}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        ),
    },
    {
      accessorKey: 'checkStatus',
      header: t('check_status'),
      cell: ({ row }) =>
        row.original.checkStatus ? (
          <Badge className={getStatusColor(row.original.checkStatus)}>
            {getStatusLabel(row.original.checkStatus)}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        ),
    },
    {
      accessorKey: 'responsiblePersonName',
      header: t('responsible'),
      cell: ({ row }) =>
        row.original.responsiblePersonName ? (
          <div className="text-sm">{row.original.responsiblePersonName}</div>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        ),
    }
  ]

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    setSearchValue(debouncedSearch)
  }, [debouncedSearch])

  useEffect(() => {
    onFetchData()
  }, [searchValue, pagination.pageIndex, pagination.pageSize, viewMode])

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const onFetchData = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      params.set('index', pagination.pageIndex.toString())
      params.set('size', pagination.pageSize.toString())
      if (searchValue.trim()) params.set('keyword', searchValue.trim())

      // ส่ง mine=true เฉพาะ MANAGER/SUPERVISOR ที่เลือก tab Mine
      if (isManagerOrSupervisor && viewMode === 'mine') {
        params.set('mine', 'true')
      }

      const response = await api.get<PageResponse<MachineDTO>>(
        '/api/machine/get/page',
        { params }
      )

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

  // ─── Delete ───────────────────────────────────────────────────────────────

  const onDeleteData = async (): Promise<{ success: boolean }> => {
    if (selectedIds.length === 0) return { success: false }
    try {
      const response = await api.delete<ResponseDTO<void>>('/api/machine/delete', {
        headers: { 'Content-Type': 'application/json' },
        data: selectedIds,
      })
      if (response.success) {
        toast.success(response.message)
        return { success: true }
      } else {
        toast.error(response.message)
        return { success: false }
      }
    } catch {
      toast.error(t('data_delete_failed'))
      return { success: false }
    }
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSearch = useCallback((value: string) => {
    setKeyword(value || '')
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleViewModeChange = (value: string) => {
    setViewMode(value as ViewMode)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }

  const handleSelectDelete = () => {
    if (selectedIds.length === 0) {
      toast.warning(t('please_select_at_least_one'))
      return
    }
    setShowDeleteDialog(true)
  }

  const handleAdd  = () => router.navigate({ to: '/checklist/machine/add', search: { refId: undefined } })
  const handleView = (id: number) => router.navigate({ to: '/checklist/machine/view', search: { id } })
  const handleEdit = (id: number) => router.navigate({ to: '/checklist/machine/edit', search: { id } })
  const handleDelete = (id: number) => {
    setSelectedIds([id])
    setShowDeleteDialog(true)
  }

  // ─── Table ────────────────────────────────────────────────────────────────

  const table = useReactTable({
    data,
    columns,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    manualSorting: true,
    manualFiltering: true,
    state: { pagination },
    getRowId: row => row.id.toString(),
  })

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Card className="shadow-sm border-dashboard-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 flex-wrap gap-2 border-b">
        <CardTitle className="font-bold">
          <Drill className="w-5 h-5 inline mr-2" />
          {t('machine_records')}
        </CardTitle>

        {/* Tab only for MANAGER / SUPERVISOR */}
        {isManagerOrSupervisor && (
          <Tabs value={viewMode} onValueChange={handleViewModeChange}>
            <TabsList>
              <TabsTrigger
                value="mine"
                className="data-[state=active]:bg-red-700 data-[state=active]:text-white"
              >
                {t('view_mine')}
              </TabsTrigger>
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-red-700 data-[state=active]:text-white"
              >
                {t('view_overview')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </CardHeader>

      <CardContent>
        <TblContainer>
          <div className="flex items-center justify-between gap-2">
            <DataTableToolbar
              table={table}
              isSync={false}
              isAdd={true}
              isDelete={selectedIds.length > 0}
              onSearch={handleSearch}
              onDelete={handleSelectDelete}
              onAdd={handleAdd}
              isServerSide={true}
              searchValue={keyword}
              breakpoint={1300}
              className="w-full gap-2"
            />
          </div>

          <div>
            {loading ? (
              <DataTableSkeleton
                columnCount={columns.length}
                rowCount={10}
                filterCount={0}
                cellWidths={['auto']}
                withViewOptions={false}
                withPagination={true}
                shrinkZero={false}
                className="w-full"
              />
            ) : (
              <DataTable table={table} emptyText={t('no_result')} />
            )}
          </div>

          <DeleteDialog
            isOpen={showDeleteDialog}
            onClose={() => setShowDeleteDialog(false)}
            title={t('delete_machines')}
            confirmText="DELETE"
            isAlert={false}
            variant="destructive"
            onConfirm={onDeleteData}
            onSuccess={() => {
              onFetchData()
              setSelectedIds([])
            }}
          />
        </TblContainer>
      </CardContent>
    </Card>
  )
}