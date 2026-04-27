import React from "react"
import { useEffect, useRef } from "react"
import { type Table as TanstackTable, flexRender } from "@tanstack/react-table"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn, getCommonPinningStyles } from "@/core/lib/utils"
import { useTranslation } from "@/core/contexts/language-context";

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
  table: TanstackTable<TData>
  actionBar?: React.ReactNode
  onRowDoubleClick?: (row: TData) => void
  expandedRowId?: string | null
  onRowExpand?: (rowId: TData | null) => void
  renderExpandedContent?: (row: TData) => React.ReactNode
  expandOnColumnClick?: string
  emptyText?: string
}

export function DataTableExpand<TData>({
  table,
  actionBar,
  onRowDoubleClick,
  expandedRowId,
  onRowExpand,
  renderExpandedContent,
  expandOnColumnClick,
  children,
  emptyText,
  className,
  ...props
}: DataTableProps<TData>) {
  const { t } = useTranslation();
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(event.target as Node)) {
        onRowExpand?.(null)
      }
    }

    if (expandedRowId) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [expandedRowId, onRowExpand])

  const handleCellClick = (row: any, columnId: string) => {
    if (expandOnColumnClick === columnId) {
      const rowId = row.original?.id?.toString();
      const currentExpandedId = expandedRowId?.toString();
      const clickedRowId = rowId;
      if (clickedRowId === currentExpandedId) {
        onRowExpand?.(null);
      } else {
        onRowExpand?.(row.original);
      }
    }
  };
  return (
    <div ref={tableRef} className={cn("flex w-full flex-col gap-2.5 overflow-auto", className)} {...props}>
      {children}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{
                      ...getCommonPinningStyles({ column: header.column }),
                    }}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const rowId = (row.original as { id?: string })?.id;
                const isExpanded = expandedRowId == rowId;
                return (
                  <React.Fragment key={row.id}>
                    <TableRow onDoubleClick={() => onRowDoubleClick?.(row.original)} className="cursor-pointer">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          style={{
                            ...getCommonPinningStyles({ column: cell.column }),
                          }}
                          onClick={() => handleCellClick(row, cell.column.id)}
                          className={cn(expandOnColumnClick === cell.column.id && "hover:bg-muted/50 cursor-pointer")}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    {isExpanded && renderExpandedContent && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={table.getAllColumns().length} className="p-0 border-0">
                          <div className="bg-muted/30">{renderExpandedContent(row.original)}</div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })) : (
              <TableRow>
                <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                  {t("No Results")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-2.5">
        <DataTablePagination table={table} />
        {actionBar && table.getFilteredSelectedRowModel().rows.length > 0 && actionBar}
      </div>
    </div>
  )
}
