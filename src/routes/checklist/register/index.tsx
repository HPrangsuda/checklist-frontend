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
import { Card, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/checklist/register/')({
  component: DataTbl,
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreatedByDTO {
  id:   number
  name: string | null
}

interface RegisterDTO {
  id:               number
  machineName:      string
  brand?:           string
  model?:           string
  serialNumber?:    string
  department?:      string
  note?:            string
  responsibleId?:   string
  responsibleName?: string
  supervisorId?:    string
  supervisorName?:  string
  managerId?:       string
  managerName?:     string
  createdAt?:       string   // ← รับ string จาก backend (formatted)
  createdBy?:       CreatedByDTO | null
  updatedBy?:       CreatedByDTO | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** แปลง ISO string หรือ formatted string ให้อ่านง่าย */
function formatDate(value?: string | null): string {
  if (!value) return '-'
  // ถ้า backend ส่งมาเป็น "yyyy-MM-dd HH:mm" แล้ว ใช้ตรงๆ
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)) return value
  // ถ้าเป็น ISO string แปลงก่อน
  try {
    return new Intl.DateTimeFormat('th-TH', {
      year:   'numeric',
      month:  '2-digit',
      day:    '2-digit',
      hour:   '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

function DataTbl() {
  const { t }  = useTranslation('checklist')
  const router = useRouter()

  const [pagination,       setPagination]       = useState({ pageIndex: 0, pageSize: 10 })
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedIds,      setSelectedIds]      = useState<number[]>([])
  const [data,             setData]             = useState<RegisterDTO[]>([])
  const [loading,          setLoading]          = useState(false)
  const [totalCount,       setTotalCount]       = useState(0)
  const [keyword,          setKeyword]          = useState('')
  const [searchValue,      setSearchValue]      = useState('')
  const debouncedSearch = useDebounce(keyword, 500)

  // ─── Columns ──────────────────────────────────────────────────────────────

  const columns: ColumnDef<RegisterDTO>[] = [
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
      accessorKey: 'machineName',
      header: t('machine_name'),
      cell: ({ row }) => (
        <div className="text-sm font-medium">{row.original.machineName || '-'}</div>
      ),
    },
    {
      accessorKey: 'model',
      header: t('model'),
      cell: ({ row }) => (
        <div className="text-sm">{row.original.model || '-'}</div>
      ),
    },
    {
      // ── FIX: ใช้ createdAt จาก backend โดยตรง ─────────────────────────────
      accessorKey: 'createdAt',
      header: t('request_date'),
      cell: ({ row }) => (
        <div className="text-sm">{formatDate(row.original.createdAt)}</div>
      ),
    },
    {
      // ── FIX: ใช้ createdBy.name จาก backend ──────────────────────────────
      id: 'requestBy',
      header: t('request_by'),
      cell: ({ row }) => (
        <div className="text-sm">{row.original.createdBy?.name ?? '-'}</div>
      ),
    },
    {
      id: 'action',
      header: t('action'),
      cell: ({ row }) => (
        <TblAction
          view
          onView={()   => handleView(row.original.id)}
          onDelete={() => handleDelete(row.original.id)}
        />
      ),
      size: 80,
    },
  ]

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => { setSearchValue(debouncedSearch) }, [debouncedSearch])
  useEffect(() => { onFetchData() }, [searchValue, pagination.pageIndex, pagination.pageSize])

  // ─── Data fetching ────────────────────────────────────────────────────────

  const onFetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('index', pagination.pageIndex.toString())
      params.set('size',  pagination.pageSize.toString())
      if (searchValue.trim()) params.set('keyword', searchValue.trim())

      const response = await api.get<PageResponse<RegisterDTO>>(
        '/api/register/get/page', { params }
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
      const response = await api.delete<ResponseDTO<void>>('/api/register/delete', {
        headers: { 'Content-Type': 'application/json' },
        data:    selectedIds,
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

  const handleSelectDelete = () => {
    if (selectedIds.length === 0) { toast.warning(t('please_select_at_least_one')); return }
    setShowDeleteDialog(true)
  }

  const handleAdd    = () => router.navigate({ to: '/checklist/register/add' })
  const handleView   = (id: number) => router.navigate({ to: '/checklist/register/view', search: { id } })
  const handleDelete = (id: number) => { setSelectedIds([id]); setShowDeleteDialog(true) }

  // ─── Table ────────────────────────────────────────────────────────────────

  const table = useReactTable({
    data,
    columns,
    manualPagination:  true,
    manualSorting:     true,
    manualFiltering:   true,
    getCoreRowModel:       getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel:     getSortedRowModel(),
    getFilteredRowModel:   getFilteredRowModel(),
    onPaginationChange:    setPagination,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    state: { pagination },
    getRowId: row => row.id.toString(),
  })

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-bold">{t('register_records')}</CardTitle>
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
                  emptyText={t('no_result')}
                />
              )}
            </div>

            <DeleteDialog
              isOpen={showDeleteDialog}
              onClose={() => setShowDeleteDialog(false)}
              title={t('delete_registers')}
              confirmText="DELETE"
              isAlert={false}
              variant="destructive"
              onConfirm={onDeleteData}
              onSuccess={() => { onFetchData(); setSelectedIds([]) }}
            />
          </TblContainer>
        </Card>
      </main>
    </div>
  )
}