import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, useReactTable, type ColumnDef
} from '@tanstack/react-table'
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
import { toast } from 'sonner'
import { TblAction } from '@/components/action/tbl-action'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getStatusColor } from '@/utils/status.untils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface KpiDTO {
  id: number
  memberId: number
  employeeName: string
  years: string
  months: string
  checkAll: number
  checked: number
  managerId: number
  supervisorId: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KpiTbl() {
  const router = useRouter()
  const { t } = useTranslation('checklist')

  const MONTHS = [
    { value: '01', label: t('january')   }, { value: '02', label: t('february')  },
    { value: '03', label: t('march')     }, { value: '04', label: t('april')     },
    { value: '05', label: t('may')       }, { value: '06', label: t('june')      },
    { value: '07', label: t('july')      }, { value: '08', label: t('august')    },
    { value: '09', label: t('september') }, { value: '10', label: t('october')   },
    { value: '11', label: t('november')  }, { value: '12', label: t('december')  },
  ]

  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear().toString())
  const [month, setMonth] = useState((now.getMonth() + 1).toString().padStart(2, '0'))
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [data,       setData]       = useState<KpiDTO[]>([])
  const [loading,    setLoading]    = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [keyword,    setKeyword]    = useState('')
  const [searchValue, setSearchValue] = useState('')
  const debouncedSearch = useDebounce(keyword, 500)

  const columns: ColumnDef<KpiDTO>[] = [
    {
      accessorKey: 'employeeName',
      header: t('name'),
      cell: ({ row }) => <span>{row.original.employeeName}</span>,
    },
    {
      accessorKey: 'checkAll',
      header: t('check_all'),
      cell: ({ row }) => <span className="text-center block">{row.original.checkAll}</span>,
    },
    {
      accessorKey: 'checked',
      header: t('checked'),
      cell: ({ row }) => <span className="text-center block">{row.original.checked}</span>,
    },
    {
      id: 'achievement',
      header: t('achievement'),
      cell: ({ row }) => {
        const { checkAll, checked } = row.original
        const pct = checkAll > 0 ? Math.round((checked / checkAll) * 100) : 0
        const status = pct >= 100 ? 'completed' : pct >= 70 ? 'under maintenance' : 'canceled'
        return (
          <div className="flex justify-center">
            <Badge className={getStatusColor(status)}>
              {pct}%
            </Badge>
          </div>
        )
      },
    },
    {
      id: 'action',
      header: t('action'),
      cell: ({ row }) => (
        <TblAction
          view={true}
          onView={() => handleView(row.original.id)}
        />
      ),
    },
  ]

  useEffect(() => { setSearchValue(debouncedSearch) }, [debouncedSearch])
  useEffect(() => { onFetchData() }, [searchValue, pagination.pageIndex, pagination.pageSize, year, month])

  const onFetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('years', year)
      params.set('months', month)
      params.set('index', pagination.pageIndex.toString())
      params.set('size',  pagination.pageSize.toString())
      if (searchValue.trim()) params.set('keyword', searchValue.trim())

      const response = await api.get<PageResponse<KpiDTO>>('/api/kpi/all', { params })
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

  const handleSearch = useCallback((value: string) => {
    setKeyword(value || '')
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleView = (id: number) => {
    router.navigate({ to: '/checklist/kpi/view', search: { id } })
  }

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
    <Card className="shadow-sm border-dashboard-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 flex-wrap gap-2 border-b">
        <CardTitle className="font-bold">{t('kpi_records')}</CardTitle>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={e => { setYear(e.target.value); setPagination(p => ({ ...p, pageIndex: 0 })) }}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 6 }, (_, i) => now.getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={month}
            onChange={e => { setMonth(e.target.value); setPagination(p => ({ ...p, pageIndex: 0 })) }}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTHS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        <TblContainer>
          <div className="p-0">
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
              <DataTable table={table} emptyText={t('no_result')} />
            )}
          </div>
        </TblContainer>
      </CardContent>
    </Card>
  )
}