import type { Table } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/core/lib/utils";
import { useEffect, useState } from "react";
import { useTranslation } from "@/core/contexts/language-context";

interface DataTablePaginationProps<TData> extends React.ComponentProps<"div"> {
  table: Table<TData>;
  pageSizeOptions?: number[];
  onPageChange?: (pageIndex: number, pageSize: number) => void;
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  className,
  ...props
}: DataTablePaginationProps<TData>) {
  const { t } = useTranslation();
  const [jumpToPage, setJumpToPage] = useState(() =>
    (table.getState().pagination.pageIndex + 1).toString()
  );

  const handlePageSizeChange = (value: string) => {
    const newSize = Number(value);
    table.setPageSize(newSize);
    onPageChange?.(table.getState().pagination.pageIndex, newSize);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < table.getPageCount()) {
      table.setPageIndex(newPage);
      onPageChange?.(newPage, table.getState().pagination.pageSize);
      setJumpToPage((newPage + 1).toString());
    }
  };

  const handleJumpToPage = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const pageNumber = parseInt(jumpToPage) - 1;
      if (!isNaN(pageNumber)) {
        handlePageChange(pageNumber);
      }
    }
  };

  useEffect(() => {
    setJumpToPage((table.getState().pagination.pageIndex + 1).toString());
  }, [table.getState().pagination.pageIndex]);

  return (
    <div
      className={cn(
        "flex w-full flex-col-reverse items-center justify-between gap-2 overflow-auto p-1 sm:flex-row sm:gap-8",
        className,
      )}
      {...props}>
      <div className="flex-1 whitespace-nowrap text-muted-foreground text-sm"></div>
      <div className="flex flex-col-reverse items-center gap-2 sm:flex-row sm:gap-2 lg:gap-2">
        <div className="flex items-center space-x-2">
          <Button
            aria-label={t("Go to first page")}
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => handlePageChange(0)}
            disabled={!table.getCanPreviousPage()}>
            <ChevronsLeft />
          </Button>
          <Button
            aria-label={t("Go to previous page")}
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => handlePageChange(table.getState().pagination.pageIndex - 1)}
            disabled={!table.getCanPreviousPage()}>
            <ChevronLeft />
          </Button>
          <Button
            aria-label={t("Go to next page")}
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => handlePageChange(table.getState().pagination.pageIndex + 1)}
            disabled={!table.getCanNextPage()}>
            <ChevronRight />
          </Button>
          <Button
            aria-label={t("Go to last page")}
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => handlePageChange(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}>
            <ChevronsRight />
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Select
            key={`${table.getState().pagination.pageSize} / page`}
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={handlePageSizeChange}>
            <SelectTrigger className="h-8 min-w-[6rem] [&[data-size]]:h-8">
              <SelectValue placeholder={`${table.getState().pagination.pageSize} / ${t("page")}`} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={`${pageSize}`} value={`${pageSize}`}>
                  {pageSize} / {t("page")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-center gap-2 font-normal text-sm">
          <span>{t("Go to")}</span>
          <Input
            type="number"
            max={table.getPageCount()}
            value={jumpToPage}
            onChange={(e) => setJumpToPage(e.target.value)}
            onKeyDown={handleJumpToPage}
            onBlur={() => {
              const pageNumber = parseInt(jumpToPage) - 1;
              if (!isNaN(pageNumber)) {
                handlePageChange(pageNumber);
              } else {
                setJumpToPage((table.getState().pagination.pageIndex + 1).toString());
              }
            }}
            className="h-8 w-12 px-1 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>
    </div>
  );
}
