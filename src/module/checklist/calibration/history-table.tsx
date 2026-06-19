import { getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { useTranslation } from '@/core/contexts/language-context'
import { TblContainer } from '@/components/layout/tbl-container'
import { DataTable } from '@/components/data-table/data-table'
import { api } from '@/core/interceptor/api.interceptor'
import { useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { useDebounce } from '@/core/hooks/use-debounce'
import { toast } from 'sonner';
import { TblAction } from '@/components/action/tbl-action';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getStatusColor } from '@/utils/status.untils'

interface CalibrationDTO {
  id: number;
  machineCode: string;
  machineName: string;
  years: number;
  dueDate: string;
  certificateDate: string;
  results: string;
  calibrationStatus: string;
}

interface ApiResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

interface Props {
  machineCode: string;
}

// ─── i18n status key map ──────────────────────────────────────────────────────
const STATUS_I18N_MAP: Record<string, string> = {
  'pass':     'status_pass',
  'not pass': 'status_not_pass',
  'on time':  'status_on_time',
  'overdue':  'status_overdue',
  'pending':  'status_pending',
}

// ─── Format date YYYY-MM-DD or ISO → DD-MM-YYYY ───────────────────────────────
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-'
  const [year, month, day] = dateStr.split('T')[0].split('-')
  return `${day}-${month}-${year}`
}

export function CalibrationTbl({ machineCode }: Props) {
  const [pagination, setPagination]   = useState({ pageIndex: 0, pageSize: 10 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [allData, setAllData]         = useState<CalibrationDTO[]>([]);
  const [data, setData]               = useState<CalibrationDTO[]>([]);
  const [loading, setLoading]         = useState(false);
  const [totalCount, setTotalCount]   = useState(0);
  const [keyword, setKeyword]         = useState('');
  const debouncedSearch = useDebounce(keyword, 500);
  const router = useRouter();
  const { t }  = useTranslation();

  const translateStatus = (status: string): string => {
    if (!status) return '-'
    const key = STATUS_I18N_MAP[status.toLowerCase()]
    return key ? t(key) : status
  }

  const columns = useMemo<ColumnDef<CalibrationDTO>[]>(() => [
    {
      accessorKey: 'years',
      header: t('years'),
      cell: ({ row }) => <div>{row.original.years ?? '-'}</div>,
    },
    {
      accessorKey: 'dueDate',
      header: t('due_date'),
      cell: ({ row }) => <div className="text-sm">{formatDate(row.original.dueDate)}</div>,
    },
    {
      accessorKey: 'certificateDate',
      header: t('certificate_date'),
      cell: ({ row }) => <div className="text-sm">{formatDate(row.original.certificateDate)}</div>,
    },
    {
      accessorKey: 'results',
      header: t('results'),
      cell: ({ row }) => {
        const status = row.original.results
        return status
          ? <Badge className={getStatusColor(status)}>{translateStatus(status)}</Badge>
          : <span>-</span>
      },
    },
    {
      accessorKey: 'calibrationStatus',
      header: t('calibration_status'),
      cell: ({ row }) => {
        const status = row.original.calibrationStatus
        return status
          ? <Badge className={getStatusColor(status)}>{translateStatus(status)}</Badge>
          : <span>-</span>
      },
    },
    {
      id: 'action',
      header: t('action'),
      cell: ({ row }) => (
        <TblAction
          view={true}
          edit={true}
          onView={() => handleView(row.original.id)}
          onEdit={() => handleEdit(row.original.id)}
        />
      ),
    },
  ], [data, selectedIds, t]);

  useEffect(() => {
    if (machineCode) onFetchData()
  }, [machineCode]);

  useEffect(() => {
    const filtered = debouncedSearch.trim()
      ? allData.filter(item =>
          item.machineCode?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          item.machineName?.toLowerCase().includes(debouncedSearch.toLowerCase())
        )
      : allData;

    setTotalCount(filtered.length);
    const start = pagination.pageIndex * pagination.pageSize;
    setData(filtered.slice(start, start + pagination.pageSize));
    setSelectedIds([]);
  }, [debouncedSearch, pagination.pageIndex, pagination.pageSize, allData]);

  const onFetchData = async () => {
    try {
      setLoading(true);
      const resp = await api.get(`/api/calibration/get/${machineCode}`);
      const responseData = resp as ApiResponse<CalibrationDTO[]>;
      if (responseData.status) {
        setAllData(responseData.data ?? []);
      } else {
        toast.error(t(responseData.message ?? 'data_fetch_failed'));
      }
    } catch {
      toast.error(t('data_fetch_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback((value: string) => {
    setKeyword(value || '');
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, []);

  const handleView = (id: number) =>
    router.navigate({ to: '/checklist/calibration/view', search: { id } });

  const handleEdit = (id: number) =>
    router.navigate({ to: '/checklist/calibration/edit', search: { id } });

  const table = useReactTable({
    data,
    columns,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    pageCount: Math.ceil(totalCount / pagination.pageSize) || 0,
    manualSorting: true,
    manualFiltering: true,
    state: { pagination },
    getRowId: (row) => row.id.toString(),
  });

  return (
    <Card className="shadow-sm border-dashboard-border mt-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-dashboard-bg/50">
        <CardTitle className="font-bold">{t('calibration_lists')}</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
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
        </TblContainer>
      </CardContent>
    </Card>
  );
}