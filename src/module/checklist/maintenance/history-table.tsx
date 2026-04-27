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

interface MaintenanceDTO {
  id: number;
  machineCode: string;
  machineName: string;
  years: string;
  round: number;
  dueDate: string;
  planDate: string;
  actualDate: string;
  status: string;
}

interface ApiResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

interface Props {
  machineCode: string;
}

export function MaintenanceTbl({ machineCode }: Props) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [allData, setAllData] = useState<MaintenanceDTO[]>([]);
  const [data, setData] = useState<MaintenanceDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [keyword, setKeyword] = useState("");
  const debouncedSearch = useDebounce(keyword, 500);
  const router = useRouter();
  const { t } = useTranslation();

  const getStatusColor = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-600 dark:text-yellow-100';
      case 'in progress':
        return 'bg-blue-100 text-blue-600 dark:text-blue-100';
      case 'completed':
        return 'bg-emerald-100 text-emerald-600 dark:text-emerald-100';
      case 'completed (late)':
        return 'bg-orange-100 text-orange-600 dark:text-orange-100';
      case 'overdue':
        return 'bg-red-100 text-red-600 dark:text-red-100';
      default:
        return 'bg-zinc-100 text-zinc-600 dark:text-zinc-100';
    }
  };

  const columns = useMemo<ColumnDef<MaintenanceDTO>[]>(() => [
    {
      accessorKey: "years",
      header: "Years",
      cell: ({ row }) => <div>{row.original.years ?? '-'}</div>,
    },
    {
      accessorKey: "round",
      header: "Round",
      cell: ({ row }) => <div>{row.original.round ?? '-'}</div>,
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => {
        const dateStr = row.original.dueDate;
        if (!dateStr) return <div className="text-sm">-</div>;
        const [year, month, day] = dateStr.split('-');
        return <div className="text-sm">{`${day}-${month}-${year}`}</div>;
      },
    },
    {
      accessorKey: "planDate",
      header: "Plan Date",
      cell: ({ row }) => {
        const dateStr = row.original.planDate;
        if (!dateStr) return <div className="text-sm">-</div>;
        const [year, month, day] = dateStr.split('-');
        return <div className="text-sm">{`${day}-${month}-${year}`}</div>;
      },
    },
    {
      accessorKey: "actualDate",
      header: "Actual Date",
      cell: ({ row }) => {
        const dateStr = row.original.actualDate;
        if (!dateStr) return <div className="text-sm">-</div>;
        const [year, month, day] = dateStr.split('-');
        return <div className="text-sm">{`${day}-${month}-${year}`}</div>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        return status
          ? <Badge className={getStatusColor(status)}>{status}</Badge>
          : <>-</>;
      },
    },
    {
      id: "action",
      header: "Action",
      cell: ({ row }) => (
        <TblAction
          view={true}
          edit={true}
          onView={() => handleView(row.original.id)}
          onEdit={() => handleEdit(row.original.id)}
        />
      ),
    }
  ], [data, selectedIds]);

  useEffect(() => {
    if (machineCode) {
      onFetchData();
    }
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
    const end = start + pagination.pageSize;
    setData(filtered.slice(start, end));
    setSelectedIds([]);
  }, [debouncedSearch, pagination.pageIndex, pagination.pageSize, allData]);

  const onFetchData = async () => {
    try {
      setLoading(true);
      const resp = await api.get(`/api/maintenance/get/${machineCode}`);
      const responseData = resp as ApiResponse<MaintenanceDTO[]>;
      if (responseData.status) {
        setAllData(responseData.data ?? []);
      } else {
        toast.error(t(responseData.message ?? "Data fetch failed"));
      }
    } catch (error) {
      toast.error(t("Data fetch failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback((value: string) => {
    setKeyword(value || "");
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, []);

  const handleView = (id: number) => {
    router.navigate({
      to: "/checklist/maintenance/view",
      search: { id }
    });
  };

  const handleEdit = (id: number) => {
    router.navigate({ to: "/checklist/maintenance/edit", search: { id } });
  };

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
    getRowId: (row) => row.id.toString()
  });

  return (
    <Card className="shadow-sm border-dashboard-border mt-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-dashboard-bg/50">
        <CardTitle className="font-bold">Maintenance History</CardTitle>
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
                cellWidths={["auto"]}
                withViewOptions={false}
                withPagination={true}
                shrinkZero={false}
                className="w-full"
              />
            ) : (
              <DataTable table={table} emptyText={t("No Result")} />
            )}
          </div>
        </TblContainer>
      </CardContent>
    </Card>
  );
}