import { getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import type { PageResponse, ResponseDTO } from '@/core/types/common'
import { useTranslation } from '@/core/contexts/language-context'
import { DeleteDialog } from '@/components/dialog/delete-dialog'
import { TblContainer } from '@/components/layout/tbl-container'
import { DataTable } from '@/components/data-table/data-table'
import { api } from '@/core/interceptor/api.interceptor'
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { useDebounce } from '@/core/hooks/use-debounce'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner';
import { TblAction } from '@/components/action/tbl-action';

export const Route = createFileRoute('/account/order-status/')({
  component: DataTbl,
});

interface DataDTO {
  id: number;

  createdAt: Date;
  updatedAt: Date;
}

function DataTbl() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [data, setData] = useState<DataDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0)
  const [keyword, setKeyword] = useState("");
  const debouncedSearch = useDebounce(keyword, 500);
  const { t } = useTranslation();

  const columns: ColumnDef<DataDTO>[] = [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={data.length > 0 && data.every((row) => selectedIds.includes(row.id.toString()))}
          onCheckedChange={(checked) => {
            setSelectedIds(() => {
              if (checked) {
                return data.map((row) => row.id.toString());
              }
              return [];
            });
          }}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedIds.includes(row.original.id.toString())}
            onCheckedChange={(checked) => {
              setSelectedIds((prev) => {
                if (checked) {
                  return [...prev, row.original.id.toString()];
                }
                return prev.filter((id) => id !== row.original.id.toString());
              });
            }}
            aria-label="Select row"
          />
        </div>
      ),
      size: 32,
    },
    {
      accessorKey: "id",
      header: "Id",
      cell: ({ row }) => {
        const id = row.original.id;
        return id ? (
          <div>
            {id}
          </div>
        ) : null
      },
    },
    {
      id: "action",
      header: "Action",
      cell: ({ row }) => (
        <TblAction
          view={true}
          edit={true}
          delete={true}
          onView={() => handleView(row.original.id)}
          onEdit={() => handleEdit(row.original.id)}
          onDelete={() => handleDelete(row.original.id)}
        />
      ),
    }
  ]

  useEffect(() => {
    setSearchValue(debouncedSearch);
  }, [debouncedSearch]);

  useEffect(() => {
    onFetchData();
  }, [searchValue, pagination.pageIndex, pagination.pageSize]);

  const onFetchData = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams();
      queryParams.set('index', pagination.pageIndex.toString());
      queryParams.set('size', pagination.pageSize.toString());
      if (searchValue.trim()) {
        queryParams.set('keyword', searchValue.trim());
      }
      const response = await api.get<PageResponse<DataDTO>>(`/api/account/inets/get/page`, { params: queryParams });
      if (response.status) {
        setData(response.data);
        setTotalCount(response.totalElements);
      } else {
        toast.error(t("message", response.message));
      }
    } catch (error) {
      toast.error(t("Data fetch failed"))
    } finally {
      setLoading(false);
      setSelectedIds([]);
    }
  }

  const onDeleteData = async (): Promise<{ success: boolean }> => {
    if (!selectedIds) {
      return { success: false };
    }
    try {
      const response = await api.delete<ResponseDTO<void>>(`/api/account/inets/delete`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: { ids: selectedIds },
      });
      if (response.success) {
        toast.success(t("message", response.message));
        return { success: true };
      } else {
        toast.error(t("message", response.message));
        return { success: false };
      }
    } catch (error) {
      toast.error(t("Data delete Failed"));
      return { success: false };
    }
  };

  const handleSearch = useCallback((value: string) => {
    setKeyword(value || "");
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, []);

  const handleSelectDelete = async () => {
    if (selectedIds.length === 0) return;
    setShowDeleteDialog(true);
  }

  const handleView = (id: string | number) => {

  }

  const handleEdit = (id: string | number) => {

  }

  const handleDelete = (id: string | number) => {

  }

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
    getRowId: (row) => row.id.toString()
  });
  return (
    <TblContainer>
      <div>
        <DataTableToolbar
          table={table}
          isSync={false}
          isDelete={selectedIds.length > 0}
          onSearch={handleSearch}
          onDelete={handleSelectDelete}
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
            className="w-full" />
        ) : (
          <DataTable table={table}
            emptyText={t("No Result")}>
          </DataTable>
        )}
      </div>
      <div>
        <DeleteDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          title={t("Delete Invoices")}
          confirmText="DELETE"
          isAlert={false}
          variant='destructive'
          onConfirm={onDeleteData}
          onSuccess={() => {
            onFetchData();
          }}
        />
      </div>
    </TblContainer>
  )
}