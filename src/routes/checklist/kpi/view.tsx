import { getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { useTranslation } from '@/core/contexts/language-context'
import { TblContainer } from '@/components/layout/tbl-container'
import { DataTable } from '@/components/data-table/data-table'
import { api } from '@/core/interceptor/api.interceptor'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { TblAction } from '@/components/action/tbl-action'

export const Route = createFileRoute('/checklist/kpi/view')({
  validateSearch: (search: Record<string, unknown>) => ({
    id: search.id ? Number(search.id) : undefined,
  }),
  component: RouteComponent,
})

interface ChecklistListDTO {
  id: number
  machineCode: string
  machineName: string
  machineStatus: string
  checklistStatus: string
  userName: string
  createdAt: string
}

interface KpiResponseDTO {
  id: number
  employeeId: string
  employeeName: string
  years: string
  months: string
  checkAll: number
  checked: number
  managerId: string
  supervisorId: string
  checklists: ChecklistListDTO[]
}

function RouteComponent() {
  const handleViewChecklist = (checklistId: number) => {
    router.navigate({ to: '/checklist/checklist-records/view', search: { id: checklistId } })
  }

  const { t } = useTranslation('checklist')
  const router = useRouter()
  const { id } = Route.useSearch()

  const [kpi, setKpi] = useState<KpiResponseDTO | null>(null)
  const [loading, setLoading] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ready to use': case 'completed':
        return 'bg-emerald-100 text-emerald-600 dark:text-emerald-100'
      case 'repair': case 'pending':
        return 'bg-red-100 text-red-600 dark:text-red-100'
      case 'not in use': case 'pending manager':
        return 'bg-yellow-100 text-yellow-600 dark:text-yellow-100'
      case 'pending supervisor':
        return 'bg-orange-100 text-orange-600 dark:text-orange-100'
      default:
        return 'bg-zinc-100 text-zinc-600 dark:text-zinc-100'
    }
  }

  const columns: ColumnDef<ChecklistListDTO>[] = [
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
      accessorKey: 'userName',
      header: t('user_name'),
      cell: ({ row }) => <div className="text-sm">{row.original.userName || '-'}</div>,
    },
    {
      accessorKey: 'createdAt',
      header: t('created_at'),
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.createdAt ? new Date(row.original.createdAt).toLocaleString() : '-'}
        </div>
      ),
    },
    {
      accessorKey: 'machineStatus',
      header: t('machine_status'),
      cell: ({ row }) => row.original.machineStatus ? (
        <Badge className={getStatusColor(row.original.machineStatus)}>
          {row.original.machineStatus}
        </Badge>
      ) : null,
    },
    {
      accessorKey: 'checklistStatus',
      header: t('check_status'),
      cell: ({ row }) => row.original.checklistStatus ? (
        <Badge className={getStatusColor(row.original.checklistStatus)}>
          {row.original.checklistStatus}
        </Badge>
      ) : null,
    },
    {
      id: 'action',
      header: t('action'),
      cell: ({ row }) => (
        <TblAction
          view
          onView={() => handleViewChecklist(row.original.id)}
        />
      ),
      size: 80,
    },
  ]

  const table = useReactTable({
    data: kpi?.checklists ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: row => row.id.toString(),
  })

  useEffect(() => {
    if (!id || isNaN(id)) return
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await api.get<{ data: KpiResponseDTO }>(`/api/kpi/${id}`)
        if (response?.data) {
          setKpi(response.data)
        } else {
          toast.error(t('data_fetch_failed'))
        }
      } catch {
        toast.error(t('data_fetch_failed'))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const percent = kpi && kpi.checkAll > 0
    ? Math.round((kpi.checked / kpi.checkAll) * 100)
    : 0

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-4">

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">{t('kpi_view')}</h1>
        </div>

        <Card className="p-6">
          <CardHeader className="p-0">
            <CardTitle className="font-bold">{t('kpi_summary')}</CardTitle>
          </CardHeader>
          {loading ? (
            <div className="h-20 animate-pulse bg-muted rounded" />
          ) : kpi ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('employee_name')}</p>
                <p className="font-medium">{kpi.employeeName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('period')}</p>
                <p className="font-medium">{kpi.months}/{kpi.years}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('checked')}</p>
                <p className="font-medium">{kpi.checked} / {kpi.checkAll}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('percent')}</p>
                <p className={`font-bold text-lg ${percent >= 100 ? 'text-emerald-600' : percent >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {percent}%
                </p>
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="font-bold">{t('checklist_records')}</CardTitle>
          </CardHeader>
          <TblContainer>
            <div>
              <DataTableToolbar
                table={table}
                isSync={false}
                isServerSide={false}
                breakpoint={1300}
                className="w-full gap-2"
              />
            </div>
            <div>
              {loading ? (
                <DataTableSkeleton
                  columnCount={columns.length} rowCount={5} filterCount={0}
                  cellWidths={['auto']} withViewOptions={false} withPagination={true}
                  shrinkZero={false} className="w-full"
                />
              ) : (
                <DataTable table={table} emptyText={t('no_result')} />
              )}
            </div>
          </TblContainer>
        </Card>

      </main>
    </div>
  )
}