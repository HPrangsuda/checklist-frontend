import { getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import type { AuditMemberDTO, PageResponse, ResponseDTO } from '@/core/types/common'
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { DataTableExpand } from '@/components/data-table/data-table-expand';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from '@/core/contexts/language-context'
import { DeleteDialog } from '@/components/dialog/delete-dialog'
import { TblContainer } from '@/components/layout/tbl-container'
import { InetActions } from '@/module/account/inet/inet-action';
import { DateTimeCell } from '@/components/block/date-time';
import { StatusBadge } from '@/module/account/inet/tag';
import { api } from '@/core/interceptor/api.interceptor'
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { useDebounce } from '@/core/hooks/use-debounce'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner';
import { InetSync } from '@/module/account/inet/sync';
import { AlertCircleIcon } from 'lucide-react';

export const Route = createFileRoute('/account/inets/')({
  component: DataTbl,
});

interface DataDTO {
  id: number;
  isCredit: boolean;
  sellerId: string | null;
  departmentName: string | null;
  orderNumber: string | null;
  message388: string | null;
  messageT01: string | null;
  message81: string | null;
  status: string | null;
  text388: string | null;
  text01: string | null;
  textT81: string | null;
  file388: string | null;
  fileT01: string | null;
  file81: string | null;
  modify388By: AuditMemberDTO;
  modifyT01By: AuditMemberDTO;
  modify81By: AuditMemberDTO;
  createdAt: Date;
  updatedAt: Date;
}

function DataTbl() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [data, setData] = useState<DataDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0)
  const [keyword, setKeyword] = useState("");
  const [showSync, setSync] = useState(false);
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
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <div>
            <StatusBadge status={status} />
          </div>
        );
      }
    },
    {
      accessorKey: "modifyBy",
      header: "Modify By",
      cell: ({ row }) => {
        const updatedAt = row.original.updatedAt;
        return (
          <div>
            <DateTimeCell date={updatedAt}></DateTimeCell>
          </div>
        );
      }
    },
    {
      id: "invoice",
      header: () => <div>Invoice</div>,
      cell: ({ row }) => (
        <InetActions
          id={row.original.id.toString()}
          type="invoice"
          typeCode="388"
          isLeft={true}
          isCredit={row.original.isCredit}
          onDataChangeSuccess={onFetchData}
          disableGenerate={false}
          disableSend={false}
          disableDownload={false}
          disableView={false}
        />
      ),
    },
    {
      id: "receipt",
      header: () => <div>Receipt</div>,
      cell: ({ row }) => (
        <InetActions
          id={row.original.id.toString()}
          type="receipt"
          typeCode="T01"
          isLeft={true}
          isCredit={row.original.isCredit}
          onDataChangeSuccess={onFetchData}
          disableSend={row.original.fileT01 != null}
        />
      ),
    },
    {
      id: "credit_note",
      header: () => <div>Credit Note</div>,
      cell: ({ row }) => (
        <InetActions
          id={row.original.id.toString()}
          type="credit"
          typeCode="81"
          isLeft={true}
          isCredit={row.original.isCredit}
          onDataChangeSuccess={onFetchData}
          disableSend={row.original.file81 != null}
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

  const handleSync = () => {
    setSync(true);
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
  const renderExpandedContent = (row: DataDTO) => {
    const status = row.status;
    if (status === "SUCCESS") {
      return null; // don't show anything if Success
    }
    return (
      <div>
        <Alert variant="destructive" className="border-none rounded-none bg-red-50">
          <AlertCircleIcon />
          <AlertTitle>Unable to process record.</AlertTitle>
          <AlertDescription>
            <div className='break-text text-wrap'>
              {row.message388 && <p>{row.message388}</p>}
              {row.messageT01 && <p>{row.messageT01}</p>}
              {row.message81 && <p>{row.message81}</p>}
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  };
  return (
    <TblContainer>
      <div>
        <DataTableToolbar
          table={table}
          isSync={true}
          isDelete={selectedIds.length > 0}
          onSync={handleSync}
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
          <DataTableExpand table={table}
            emptyText={t("No Result")}
            expandedRowId={expandedRowId}
            expandOnColumnClick="status"
            onRowExpand={(row) => {
              if (!row) {
                setExpandedRowId(null);
                return;
              }
              setExpandedRowId(row.id.toString());
            }}
            renderExpandedContent={renderExpandedContent}>
          </DataTableExpand>
        )}
      </div>
      <div>
        <InetSync
          open={showSync}
          onCancel={() => setSync(false)}
          onSuccess={() => {
            onFetchData();
          }}
        />
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