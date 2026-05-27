import { useEffect, useState } from 'react'
import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, type ColumnDef } from '@tanstack/react-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton'
import { Badge } from '@/components/ui/badge'
import { ClipboardList } from 'lucide-react'
import { api } from '@/core/interceptor/api.interceptor'
import { useRouter } from '@tanstack/react-router'
import { useTranslation } from '@/core/contexts/language-context'
import { getStatusColor } from '@/utils/status.untils'
import type { PageResponse } from '@/core/types/common'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MachineDTO {
  id: number
  machineCode: string
  machineName: string
  machineStatus: string
  checkStatus: string         
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PendingCard() {
  const { t } = useTranslation('checklist')
  const router = useRouter()

  const [pendingItems, setPendingItems] = useState<MachineDTO[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchPendingItems() }, [])

  const fetchPendingItems = async () => {
    try {
        setLoading(true)
        const params = new URLSearchParams()
        params.set('index', '0')
        params.set('size', '100')
        params.set('mine', 'true')
        params.set('checkStatus', 'PENDING')   

        const response = await api.get<PageResponse<MachineDTO>>('/api/machine/get/page', { params })
        if (response?.success) {
        setPendingItems(response.data ?? [])
        }
    } catch {
        // ignore
    } finally {
        setLoading(false)
    }
    }

  const getStatusLabel = (status: string) => {
    const key = `status_${status.toLowerCase().replace(/\s+/g, '_')}`
    const translated = t(key)
    return translated !== key ? translated : status
  }

  const columns: ColumnDef<MachineDTO>[] = [
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
      accessorKey: 'checkStatus',
      header: t('check_status'),
      cell: ({ row }) =>
        row.original.checkStatus ? (
          <Badge className={getStatusColor(row.original.checkStatus)}>
            {getStatusLabel(row.original.checkStatus)}
          </Badge>
        ) : null,
    },
  ]

  const table = useReactTable({
    data: pendingItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: row => row.id.toString(),
  })

  if (!loading && pendingItems.length === 0) return null

  return (
    <Card className="p-6 border-red-200 dark:border-red-800">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4 px-0 pt-0">
        <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
          <ClipboardList className="h-5 w-5 text-red-600 dark:text-red-300" />
        </div>
        <div className="flex items-center gap-2">
          <CardTitle className="font-bold">{t('pending_check')}</CardTitle>
          {!loading && (
            <Badge className="bg-red-100 text-red-600 dark:text-red-100">
              {pendingItems.length}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        {loading ? (
          <DataTableSkeleton
            columnCount={columns.length} rowCount={3} filterCount={0}
            cellWidths={['auto']} withViewOptions={false} withPagination={false}
            shrinkZero={false} className="w-full"
          />
        ) : (
          <DataTable table={table} emptyText={t('no_result')} />
        )}
      </CardContent>
    </Card>
  )
}