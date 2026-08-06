import { getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import type { PageResponse, ResponseDTO } from '@/core/types/common'
import { useTranslation } from '@/core/contexts/language-context'
import { TblContainer } from '@/components/layout/tbl-container'
import { DataTable } from '@/components/data-table/data-table'
import { api } from '@/core/interceptor/api.interceptor'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { useDebounce } from '@/core/hooks/use-debounce'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/core/contexts/auth-context'

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
  createdAt?:       string
  createdBy?:       CreatedByDTO | null
  updatedBy?:       CreatedByDTO | null
  hasMachine?:      boolean
  machineCount?:    number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value?: string | null): string {
  if (!value) return '-'
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)) return value
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

  const { role } = useAuth()
  const isAdmin = role === 'ADMIN'

  const [pagination,       setPagination]       = useState({ pageIndex: 0, pageSize: 10 })
  const [data,             setData]             = useState<RegisterDTO[]>([])
  const [loading,          setLoading]          = useState(false)
  const [totalCount,       setTotalCount]       = useState(0)
  const [keyword,          setKeyword]          = useState('')
  const [searchValue,      setSearchValue]      = useState('')
  const debouncedSearch = useDebounce(keyword, 500)

  // ─── Columns ──────────────────────────────────────────────────────────────

  const columns: ColumnDef<RegisterDTO>[] = [
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
      accessorKey: 'createdAt',
      header: t('request_date'),
      cell: ({ row }) => (
        <div className="text-sm">{formatDate(row.original.createdAt)}</div>
      ),
    },
    {
      id: 'requestBy',
      header: t('request_by'),
      cell: ({ row }) => (
        <div className="text-sm">{row.original.createdBy?.name ?? '-'}</div>
      ),
    },
    // ── คอลัมน์สถานะเครื่องจักร (เฉพาะ ADMIN) ──────────────────────────────
    ...(isAdmin ? [{
      id: 'hasMachine',
      header: t('add_machine_status'),
      cell: ({ row }: { row: { original: RegisterDTO } }) => {
        const count = row.original.machineCount ?? 0
        return count > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {t('has_machine')} {count}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
            {t('pending')}
          </span>
        )
      },
      size: 160,
    } satisfies ColumnDef<RegisterDTO>] : []),
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
    }
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSearch = useCallback((value: string) => {
    setKeyword(value || '')
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleAdd    = () => router.navigate({
    to: '/checklist/register/add',
    search: { refId: undefined }
  })
  const handleView   = (id: number) => router.navigate({ to: '/checklist/register/view', search: { id } })

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
                onSearch={handleSearch}
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
                  onRowClick={(row: RegisterDTO) => handleView(row.id)}
                />
              )}
            </div>
          </TblContainer>
        </Card>
      </main>
    </div>
  )
}