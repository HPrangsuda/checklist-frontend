import { getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { useTranslation } from '@/core/contexts/language-context'
import { TblContainer } from '@/components/layout/tbl-container'
import { DataTable } from '@/components/data-table/data-table'
import { api } from '@/core/interceptor/api.interceptor'
import { useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { useDebounce } from '@/core/hooks/use-debounce'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wrench } from 'lucide-react'
import { cn } from '@/core/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MaintenanceDTO {
  id:          number
  machineCode: string
  machineName: string
  years:       string
  round:       number
  dueDate:     string
  planDate:    string
  actualDate:  string
  status:      string
}

interface ApiResponse<T> {
  status:  boolean
  message: string
  data:    T
}

interface Props { machineCode: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d?: string) => {
  if (!d) return '-'
  const [y, m, day] = d.split('T')[0].split('-')
  return `${day}-${m}-${y}`
}

// ─── MaintenanceTbl ───────────────────────────────────────────────────────────

export function MaintenanceTbl({ machineCode }: Props) {
  const { t }  = useTranslation('checklist')
  const router = useRouter()

  const [pagination,    setPagination]    = useState({ pageIndex: 0, pageSize: 10 })
  const [allData,       setAllData]       = useState<MaintenanceDTO[]>([])
  const [data,          setData]          = useState<MaintenanceDTO[]>([])
  const [loading,       setLoading]       = useState(false)
  const [totalCount,    setTotalCount]    = useState(0)
  const [keyword,       setKeyword]       = useState('')
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null)
  const debouncedSearch = useDebounce(keyword, 500)

  const getStatusColor = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'scheduled':        return 'bg-yellow-100 text-yellow-600'
      case 'in progress':      return 'bg-blue-100 text-blue-600'
      case 'completed':        return 'bg-emerald-100 text-emerald-600'
      case 'completed (late)': return 'bg-orange-100 text-orange-600'
      case 'overdue':          return 'bg-red-100 text-red-600'
      default:                 return 'bg-zinc-100 text-zinc-600'
    }
  }

  const columns = useMemo<ColumnDef<MaintenanceDTO>[]>(() => [
    {
      accessorKey: 'years',
      header: t('years'),
      cell: ({ row }) => <div>{row.original.years ?? '-'}</div>,
    },
    {
      accessorKey: 'round',
      header: t('round'),
      cell: ({ row }) => <div>{row.original.round ?? '-'}</div>,
    },
    {
      accessorKey: 'dueDate',
      header: t('due_date'),
      cell: ({ row }) => <div className="text-sm">{fmtDate(row.original.dueDate)}</div>,
    },
    {
      accessorKey: 'planDate',
      header: t('plan_date'),
      cell: ({ row }) => <div className="text-sm">{fmtDate(row.original.planDate)}</div>,
    },
    {
      accessorKey: 'actualDate',
      header: t('actual_date'),
      cell: ({ row }) => <div className="text-sm">{fmtDate(row.original.actualDate)}</div>,
    },
    {
      accessorKey: 'status',
      header: t('check_status'),
      cell: ({ row }) => {
        const s = row.original.status
        return s ? <Badge className={getStatusColor(s)}>{s}</Badge> : <>-</>
      },
    },
  ], [t])

  useEffect(() => {
    if (machineCode) onFetchData()
  }, [machineCode])

  useEffect(() => {
    const filtered = debouncedSearch.trim()
      ? allData.filter(item =>
          item.machineCode?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          item.machineName?.toLowerCase().includes(debouncedSearch.toLowerCase())
        )
      : allData
    setTotalCount(filtered.length)
    const start = pagination.pageIndex * pagination.pageSize
    setData(filtered.slice(start, start + pagination.pageSize))
  }, [debouncedSearch, pagination.pageIndex, pagination.pageSize, allData])

  const onFetchData = async () => {
    try {
      setLoading(true)
      const resp = await api.get(`/api/maintenance/get/${machineCode}`)
      const res  = resp as ApiResponse<MaintenanceDTO[]>
      if (res.status) {
        setAllData(res.data ?? [])
      } else {
        toast.error(t('data_fetch_failed'))
      }
    } catch {
      toast.error(t('data_fetch_failed'))
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = useCallback((value: string) => {
    setKeyword(value || '')
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const table = useReactTable({
    data, columns,
    manualPagination: true,
    getCoreRowModel:       getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel:     getSortedRowModel(),
    getFilteredRowModel:   getFilteredRowModel(),
    onPaginationChange:    setPagination,
    pageCount:             Math.ceil(totalCount / pagination.pageSize) || 0,
    manualSorting: true, manualFiltering: true,
    state: { pagination },
    getRowId: row => row.id.toString(),
  })

  return (
    <Card className="shadow-sm border-dashboard-border mt-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-dashboard-bg/50">
        <CardTitle className="font-bold">
          <Wrench className="w-4 h-4 inline mr-2 text-red-600" />
          {t('maintenance_lists')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <TblContainer>
          <div>
            <DataTableToolbar
              table={table} isSync={false}
              onSearch={handleSearch} isServerSide={true}
              searchValue={keyword} breakpoint={1300} className="w-full gap-2"
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
                onRowClick={row => {
                  setSelectedRowId(row.id)
                  router.navigate({ to: '/checklist/maintenance/view', search: { id: row.id } })
                }}
                getRowClassName={row =>
                  cn(
                    'cursor-pointer transition-colors',
                    selectedRowId === row.original.id
                      ? 'bg-primary/5 border-l-2 border-l-primary'
                      : 'hover:bg-muted/50'
                  )
                }
              />
            )}
          </div>
        </TblContainer>
      </CardContent>
    </Card>
  )
}