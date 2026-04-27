import {
  getCoreRowModel, getFilteredRowModel,
  getPaginationRowModel, getSortedRowModel,
  useReactTable, type ColumnDef,
} from '@tanstack/react-table'
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import type { PageResponse, ResponseDTO } from '@/core/types/common'
import { useTranslation } from '@/core/contexts/language-context'
import { DeleteDialog } from '@/components/dialog/delete-dialog'
import { TblContainer } from '@/components/layout/tbl-container'
import { DataTable } from '@/components/data-table/data-table'
import { api } from '@/core/interceptor/api.interceptor'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { useDebounce } from '@/core/hooks/use-debounce'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { TblAction } from '@/components/action/tbl-action'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/checklist/members/')({
  component: DataTbl,
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberListDTO {
  id: number
  employeeId: string
  firstName: string
  lastName: string
  email: string
  mobiles: string
  departmentId: string
  roleType: string
  language: string
  createdAt: Date
  updatedAt: Date
}

// ─── Component ────────────────────────────────────────────────────────────────

function DataTbl() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [pagination,       setPagination]       = useState({ pageIndex: 0, pageSize: 10 })
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedIds,      setSelectedIds]      = useState<number[]>([])
  const [data,             setData]             = useState<MemberListDTO[]>([])
  const [loading,          setLoading]          = useState(false)
  const [totalCount,       setTotalCount]       = useState(0)
  const [keyword,          setKeyword]          = useState('')
  const debouncedSearch = useDebounce(keyword, 500)

  const columns: ColumnDef<MemberListDTO>[] = [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={data.length > 0 && data.every(row => selectedIds.includes(row.id))}
          onCheckedChange={checked => setSelectedIds(checked ? data.map(r => r.id) : [])}
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
    {
      accessorKey: 'employeeId',
      header: 'Employee ID',
      cell: ({ row }) => (
        <span>{row.original.employeeId}</span>
      ),
    },
    {
      id: 'fullName',
      header: 'Name',
      cell: ({ row }) => (
        <span>{row.original.firstName} {row.original.lastName}</span>
      ),
    },
    {
      accessorKey: 'roleType',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.original.roleType
        const styles: Record<string, string> = {
          ADMIN:      'bg-red-100 text-red-700',
          MANAGER:    'bg-purple-100 text-purple-700',
          SUPERVISOR: 'bg-blue-100 text-blue-700',
          MEMBER:     'bg-green-100 text-green-700',
        }
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[role] ?? 'bg-muted text-muted-foreground'}`}>
            {role}
          </span>
        )
      },
    },
    {
      id: 'action',
      header: 'Action',
      cell: ({ row }) => (
        <TblAction
          edit
          delete
          onEdit={() => handleEdit(row.original.id)}
          onDelete={() => handleDelete(row.original.id)}
        />
      ),
      size: 80,
    },
  ]

  useEffect(() => {
    onFetchData()
  }, [debouncedSearch, pagination.pageIndex, pagination.pageSize])

  const onFetchData = async () => {
    try {
      setLoading(true)
      const searchParams = new URLSearchParams()
      searchParams.set('index', pagination.pageIndex.toString())
      searchParams.set('size', pagination.pageSize.toString())
      if (debouncedSearch.trim()) searchParams.set('keyword', debouncedSearch.trim())

      const response = await api.get<PageResponse<MemberListDTO>>(
        `/api/user/get/page?${searchParams.toString()}`
      )

      if (response.success) {
        setData(response.data ?? [])
        setTotalCount(response.totalElements ?? 0)
      } else {
        toast.error(response.message ?? 'Failed to load data')
      }
    } catch {
      toast.error('Data fetch failed')
    } finally {
      setLoading(false)
      setSelectedIds([])
    }
  }

  const onDeleteData = async (): Promise<{ success: boolean }> => {
    if (!selectedIds.length) return { success: false }
    try {
      // ใช้ URLSearchParams เพื่อส่ง ids เป็น ?ids=1&ids=2
      const searchParams = new URLSearchParams()
      selectedIds.forEach(id => searchParams.append('ids', String(id)))

      const response = await api.getInstance().delete<ResponseDTO<void>>(
        `/api/user/delete?${searchParams.toString()}`
      )

      const body = response.data as any
      if (body?.success) {
        toast.success(body?.message ?? 'Deleted successfully')
        return { success: true }
      }
      toast.error(body?.message ?? 'Delete failed')
      return { success: false }
    } catch (error: any) {
      const msg =
        error?.response?.data?.detail ??
        error?.response?.data?.message ??
        'Delete failed'
      toast.error(msg)
      return { success: false }
    }
  }

  const handleSearch = useCallback((value: string) => {
    setKeyword(value || '')
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleSelectDelete = () => {
    if (selectedIds.length === 0) {
      toast.warning('Please select at least one item')
      return
    }
    setShowDeleteDialog(true)
  }

  const handleAdd    = () => navigate({ to: '/checklist/members/add' })
  const handleEdit   = (id: number) => navigate({ to: '/checklist/members/edit', search: { id } })
  const handleDelete = (id: number) => { setSelectedIds([id]); setShowDeleteDialog(true) }

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

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-bold">Member List</CardTitle>
          </CardHeader>
          <TblContainer>
            <div>
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
                <DataTable
                  table={table}
                  emptyText={t('No Result')}
                />
              )}
            </div>
            <div>
              <DeleteDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                title="Delete Members"
                confirmText="DELETE"
                isAlert={false}
                variant="destructive"
                onConfirm={onDeleteData}
                onSuccess={() => {
                  onFetchData()
                  setSelectedIds([])
                }}
              />
            </div>
          </TblContainer>
        </Card>
      </main>
    </div>
  )
}